//! Clap command definitions and their implementations.

use std::path::PathBuf;

use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use reasoning_engine::{hash_proof, ReasoningEngine, SpendRequest};
use near_settlement::{NearSettlementClient, AnchorRequest};
use tracing::info;

// ── Top-level CLI struct ──────────────────────────────────────────────────────

/// axiom-402: verifiable economic reasoning for autonomous agents.
#[derive(Parser)]
#[command(
    name    = "axiom",
    author  = "axiom-402 contributors",
    version = env!("CARGO_PKG_VERSION"),
    about   = "Derive spend proofs and anchor them on NEAR Protocol",
    long_about = None,
)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Command,
}

// ── Subcommands ───────────────────────────────────────────────────────────────

#[derive(Subcommand)]
pub enum Command {
    /// Load a MeTTa policy and derive a proof for a spend request.
    Derive(DeriveArgs),

    /// Anchor an existing proof hash on NEAR.
    Anchor(AnchorArgs),

    /// Derive a proof *and* anchor it in one shot.
    ProveAndAnchor(ProveAndAnchorArgs),
}

impl Command {
    /// Dispatch to the correct sub-command handler.
    pub async fn run(self) -> Result<()> {
        match self {
            Command::Derive(args)          => run_derive(args).await,
            Command::Anchor(args)          => run_anchor(args).await,
            Command::ProveAndAnchor(args)  => run_prove_and_anchor(args).await,
        }
    }
}

// ── Derive ────────────────────────────────────────────────────────────────────

/// Arguments for the `derive` sub-command.
#[derive(Parser)]
pub struct DeriveArgs {
    /// Path to the `.metta` policy file.
    #[arg(short = 'p', long, env = "AXIOM_POLICY_PATH")]
    policy: PathBuf,

    /// Amount of NEAR tokens to spend (e.g. `2.5`).
    #[arg(short = 'a', long)]
    amount: f64,

    /// Purpose string (must match an `allowed-purpose` in the policy).
    #[arg(short = 'u', long)]
    purpose: String,
}

async fn run_derive(args: DeriveArgs) -> Result<()> {
    let engine = ReasoningEngine::load(&args.policy)
        .with_context(|| format!("Failed to load policy: {}", args.policy.display()))?;

    let request = SpendRequest {
        amount:   args.amount,
        purpose:  args.purpose,
        metadata: Default::default(),
    };

    let tree        = engine.derive_proof(&request)
        .context("Policy derivation failed — spend request was not permitted")?;
    let hashed      = hash_proof(tree).context("Failed to hash proof tree")?;

    info!(proof_hash = %hashed.proof_hash, "Derivation complete");

    println!("\n── Proof Tree ─────────────────────────────────────────────────────────────");
    println!("{}", serde_json::to_string_pretty(&hashed.tree).context("Failed to serialise proof tree")?);
    println!("\n── SHA-256 Hash ───────────────────────────────────────────────────────────");
    println!("{}", hashed.proof_hash);

    Ok(())
}

// ── Anchor ────────────────────────────────────────────────────────────────────

/// Arguments for the `anchor` sub-command.
#[derive(Parser)]
pub struct AnchorArgs {
    /// The 64-char hex SHA-256 proof hash to anchor.
    #[arg(long, env = "AXIOM_PROOF_HASH")]
    proof_hash: String,

    /// IPFS / Arweave CID of the policy file.
    #[arg(long, env = "AXIOM_POLICY_CID")]
    policy_cid: String,
}

async fn run_anchor(args: AnchorArgs) -> Result<()> {
    let client = NearSettlementClient::from_env()
        .context("Failed to initialise NEAR settlement client (check env vars)")?;

    let receipt = client
        .anchor_proof(AnchorRequest {
            proof_hash: args.proof_hash,
            policy_cid: args.policy_cid,
        })
        .await
        .context("Failed to anchor proof on NEAR")?;

    info!(tx_hash = %receipt.tx_hash, "Proof anchored");

    println!("\n── Anchor Receipt ─────────────────────────────────────────────────────────");
    println!("{}", serde_json::to_string_pretty(&receipt).context("Failed to serialise receipt")?);
    println!(
        "\nView on explorer: https://testnet.nearblocks.io/txns/{}",
        receipt.tx_hash
    );

    Ok(())
}

// ── Prove-and-anchor ──────────────────────────────────────────────────────────

/// Arguments for the `prove-and-anchor` sub-command.
#[derive(Parser)]
pub struct ProveAndAnchorArgs {
    /// Path to the `.metta` policy file.
    #[arg(short = 'p', long, env = "AXIOM_POLICY_PATH")]
    policy: PathBuf,

    /// Amount of NEAR tokens to spend.
    #[arg(short = 'a', long)]
    amount: f64,

    /// Purpose string.
    #[arg(short = 'u', long)]
    purpose: String,

    /// IPFS / Arweave CID of the policy file.
    #[arg(long, env = "AXIOM_POLICY_CID")]
    policy_cid: String,
}

async fn run_prove_and_anchor(args: ProveAndAnchorArgs) -> Result<()> {
    // ── Step 1: derive ───────────────────────────────────────────────────────
    let engine = ReasoningEngine::load(&args.policy)
        .with_context(|| format!("Failed to load policy: {}", args.policy.display()))?;

    let request = SpendRequest {
        amount:   args.amount,
        purpose:  args.purpose,
        metadata: Default::default(),
    };

    let tree   = engine.derive_proof(&request)
        .context("Policy derivation failed — spend request was not permitted")?;
    let hashed = hash_proof(tree).context("Failed to hash proof tree")?;

    info!(proof_hash = %hashed.proof_hash, "Derivation complete");

    // ── Step 2: anchor ───────────────────────────────────────────────────────
    let client = NearSettlementClient::from_env()
        .context("Failed to initialise NEAR settlement client (check env vars)")?;

    let receipt = client
        .anchor_proof(AnchorRequest {
            proof_hash: hashed.proof_hash.clone(),
            policy_cid: args.policy_cid,
        })
        .await
        .context("Failed to anchor proof on NEAR")?;

    info!(tx_hash = %receipt.tx_hash, "Proof anchored");

    // ── Print summary ────────────────────────────────────────────────────────
    println!("\n── Proof Tree ─────────────────────────────────────────────────────────────");
    println!("{}", serde_json::to_string_pretty(&hashed.tree).context("Failed to serialise proof tree")?);
    println!("\n── Anchor Receipt ─────────────────────────────────────────────────────────");
    println!("{}", serde_json::to_string_pretty(&receipt).context("Failed to serialise receipt")?);
    println!(
        "\nView on explorer: https://testnet.nearblocks.io/txns/{}",
        receipt.tx_hash
    );

    Ok(())
}
