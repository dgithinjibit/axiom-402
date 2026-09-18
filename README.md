# axiom-402

**Verifiable economic reasoning for autonomous agents. MeTTa for the *why*, Rust for the *how*, NEAR for the *proof*.**

[![License: MIT OR Apache-2.0](https://img.shields.io/badge/license-MIT%20OR%20Apache--2.0-blue.svg)](LICENSE)

---

## Overview

axiom-402 is a verifiable reasoning layer that gives autonomous AI agents a cryptographic receipt for every spend decision — proving **why** money was spent, not just **that** it was spent.

Every spending decision is expressed as a declarative rule in [MeTTa](https://github.com/trueagi-io/hyperon-experimental), derived symbolically over a Hyperon AtomSpace, serialised as a proof tree in Rust, SHA-256 hashed, and anchored on-chain via a NEAR Protocol smart contract. Any third party can fetch the transaction, re-run the derivation, and confirm that the agent's decision followed from its declared policy — without trusting the agent, the operator, or the infrastructure.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        axiom-402-core (Rust workspace)          │
│                                                                 │
│  ┌──────────────────────┐    ┌────────────────────────────────┐ │
│  │  reasoning-engine    │    │  near-settlement               │ │
│  │  ─────────────────── │    │  ──────────────────────────── │ │
│  │  · Load .metta policy│───▶│  · Build & sign NEAR tx        │ │
│  │  · Run derivation    │    │  · Broadcast anchor_proof()    │ │
│  │  · Produce ProofTree │    │  · Return AnchorReceipt        │ │
│  │  · SHA-256 hash      │    └────────────────────────────────┘ │
│  └──────────────────────┘                   │                   │
│                                             ▼                   │
│  ┌──────────────────────┐    ┌────────────────────────────────┐ │
│  │  cli                 │    │  contracts/attestation         │ │
│  │  ─────────────────── │    │  ──────────────────────────── │ │
│  │  axiom derive        │    │  · anchor_proof()              │ │
│  │  axiom anchor        │    │  · verify_proof()   (view)     │ │
│  │  axiom prove-and-    │    │  · get_proof()      (view)     │ │
│  │        anchor        │    │  · list_proofs()    (view)     │ │
│  └──────────────────────┘    └────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              axiom-402-dev-portal (Next.js 15 App Router)       │
│                                                                 │
│   /            Docs & Quickstart                                │
│   /playground  MeTTa editor → Derive Proof → hash              │
│   /visualize   Interactive react-flow proof tree graph          │
│   /verify      NEAR tx hash → VERIFIED / TAMPERED badge         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Reasoning engine | [MeTTa / Hyperon](https://github.com/trueagi-io/hyperon-experimental) | `0.2.10` |
| Backend / CLI | Rust | `1.93` (pinned) |
| NEAR contract | [near-sdk-rs](https://github.com/near/near-sdk-rs) | `5.29.0` |
| Frontend | Next.js (App Router) + TypeScript | `15.3.3` |
| Styling | Tailwind CSS + shadcn/ui | `3.4` |
| Proof graph | [@xyflow/react](https://reactflow.dev) | `12.x` |
| Chain client | [near-api-js](https://github.com/near/near-api-js) | `5.x` |

**Hard constraints** — none of the following are used: Solidity, EVM, ZetaChain, Cairo, Starknet, ZK-SNARKs, Wolfram, Python.

---

## Repository Layout

```
axiom-402/
├── axiom-402-core/                 Rust workspace
│   ├── Cargo.toml                  Workspace root — all deps pinned here
│   ├── rust-toolchain.toml         Pins Rust 1.93 + wasm32 target
│   ├── .env.example                Copy → .env, fill in NEAR keys
│   ├── crates/
│   │   ├── reasoning-engine/       MeTTa policy loading + proof derivation
│   │   ├── near-settlement/        NEAR RPC client + transaction signing
│   │   └── cli/                    `axiom` binary (derive / anchor / prove-and-anchor)
│   ├── contracts/
│   │   └── attestation/            NEAR smart contract (anchor_proof, verify_proof)
│   └── examples/
│       └── policy.metta            Example spending policy with inline tests
│
└── axiom-402-dev-portal/           Next.js developer portal
    ├── .env.example                Copy → .env.local, set NEAR RPC + contract ID
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx            / — Docs & Quickstart
    │   │   ├── playground/         /playground — Policy editor + Derive
    │   │   ├── visualize/          /visualize  — Proof graph renderer
    │   │   ├── verify/             /verify     — On-chain verification
    │   │   └── api/derive/         POST /api/derive (proxies to Rust or mock)
    │   ├── components/
    │   │   ├── NavBar.tsx
    │   │   ├── PolicyEditor.tsx    CodeMirror-based MeTTa editor
    │   │   ├── ProofGraph.tsx      react-flow proof tree
    │   │   ├── VerifyBadge.tsx     VERIFIED / TAMPERED badge
    │   │   └── ui/                 shadcn/ui base components
    │   └── lib/
    │       ├── types.ts            Shared TypeScript types (mirrors Rust structs)
    │       ├── near.ts             Read-only NEAR RPC helpers
    │       └── utils.ts            cn(), truncateMiddle()
    └── ...config files
```

---

## Prerequisites

| Tool | Min version | Install |
|---|---|---|
| Rust | 1.93 | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| `wasm32` target | — | `rustup target add wasm32-unknown-unknown` |
| Node.js | 20 LTS | [nodejs.org](https://nodejs.org) |
| npm | 10+ | bundled with Node |
| NEAR CLI | 4+ | `npm i -g near-cli-rs` |

---

## Setup

### 1 — Clone

```bash
git clone https://github.com/your-org/axiom-402.git
cd axiom-402
```

### 2 — Rust backend

```bash
cd axiom-402-core

# Copy env template and fill in your NEAR testnet keys
cp .env.example .env

# Check the workspace compiles cleanly
cargo check

# Run the unit tests (includes NEAR contract tests)
cargo test

# Optional: run clippy
cargo clippy -- -D warnings
```

### 3 — Deploy the attestation contract (testnet)

```bash
# Build the WASM contract
cargo build -p attestation --target wasm32-unknown-unknown --release

# Deploy (replace <your-account> with your NEAR testnet account)
near deploy \
  --accountId attestation.<your-account>.testnet \
  --wasmFile target/wasm32-unknown-unknown/release/attestation.wasm

# Initialise the contract
near call attestation.<your-account>.testnet new \
  '{"owner": "<your-account>.testnet"}' \
  --accountId <your-account>.testnet
```

### 4 — Run the CLI

```bash
# Derive a proof from the example policy
cargo run -p cli -- derive \
  --policy examples/policy.metta \
  --amount 2.0 \
  --purpose weather-data

# Anchor a proof on NEAR (requires .env keys set)
cargo run -p cli -- anchor \
  --proof-hash <64-char-hex> \
  --policy-cid bafybeig…

# Or do both in one shot
cargo run -p cli -- prove-and-anchor \
  --policy examples/policy.metta \
  --amount 2.0 \
  --purpose weather-data \
  --policy-cid bafybeig…
```

### 5 — Frontend

```bash
cd axiom-402-dev-portal

# Install dependencies
npm install

# Copy env template
cp .env.example .env.local
# Edit .env.local: set NEXT_PUBLIC_CONTRACT_ID to your deployed contract

# Start the dev server
npm run dev
# → http://localhost:3000
```

---

## Using axiom-402 in Your Agent

Add the crates to your agent's `Cargo.toml`:

```toml
[dependencies]
reasoning-engine = { git = "https://github.com/your-org/axiom-402", package = "reasoning-engine" }
near-settlement   = { git = "https://github.com/your-org/axiom-402", package = "near-settlement"  }
```

Then in your agent code:

```rust
use reasoning_engine::{ReasoningEngine, hash_proof, SpendRequest};
use near_settlement::{NearSettlementClient, AnchorRequest};

// 1. Load your policy
let engine = ReasoningEngine::load("policy.metta")?;

// 2. Derive a proof for the spend decision
let tree = engine.derive_proof(&SpendRequest {
    amount:   2.0,
    purpose:  "weather-data".into(),
    metadata: Default::default(),
})?;

// 3. Hash the proof tree
let hashed = hash_proof(tree)?;
println!("proof_hash = {}", hashed.proof_hash);

// 4. Anchor it on NEAR
let client  = NearSettlementClient::from_env()?;
let receipt = client.anchor_proof(AnchorRequest {
    proof_hash: hashed.proof_hash,
    policy_cid: "bafybeig…".into(),
}).await?;

println!("Anchored at tx: {}", receipt.tx_hash);
// Verify at: https://testnet.nearblocks.io/txns/<tx_hash>
```

---

## Policy Format (MeTTa)

Policies are `.metta` files loaded into a Hyperon AtomSpace. The engine queries `(can-spend <amount> "<purpose>")` — the derivation succeeds only when the policy permits it.

```lisp
;; Ground facts (axioms)
(max-single-spend 5.0)
(allowed-purpose "weather-data")
(allowed-purpose "compute")

;; Derivation rule — root query
(= (can-spend $amount $purpose)
   (if (and
         (< $amount (max-single-spend))
         (allowed-purpose $purpose))
       True
       False))
```

See [`examples/policy.metta`](axiom-402-core/examples/policy.metta) for the full example with inline tests.

---

## Verification Flow

```
NEAR tx hash
    │
    ▼
NEAR RPC (tx lookup)
    │  extracts proof_hash from anchor_proof() args
    ▼
attestation contract — verify_proof(proof_hash)
    │  returns true / false
    ▼
VERIFIED ✓  or  TAMPERED ✗
```

Use the `/verify` page in the dev portal or call the contract directly:

```bash
near view attestation.<your-account>.testnet verify_proof \
  '{"proof_hash": "<64-char-hex>"}'
```

---

## Development Notes

### Prod-quality baselines applied from day one

- **No `unwrap()`/`expect()`** in library code — all public functions return `Result<T, E>` with typed error enums (`thiserror`).
- **`#![forbid(unsafe_code)]`** on all library crates.
- **`tracing`** for structured logging; level controlled by `AXIOM_LOG` env var.
- **`config` + `dotenvy`** for env-based config — no hardcoded values.
- **`strict: true`** TypeScript — no `any`, no unchecked index access.
- **`eslint.config.mjs`** with `@typescript-eslint/no-explicit-any: error`.
- **All dep versions pinned** in workspace `Cargo.toml` and `package.json`.
- **`rust-toolchain.toml`** pins Rust 1.93 + `wasm32-unknown-unknown` target.

### Phase roadmap

| Phase | Status | Description |
|---|---|---|
| 0 | ✅ Done | Workspace scaffold, toolchain pins, env config |
| 1 | ✅ Done | MeTTa policy loading, proof derivation, SHA-256 hashing |
| 2 | 🔲 Next | Full NEAR transaction signing via `near-crypto` (replaces Phase 1 stub) |
| 3 | 🔲 Next | NEAR Intents + Chain Signatures integration |
| 4 | 🔲 Next | Axum HTTP API server; frontend connects to real backend |
| 5 | 🔲 Future | IPFS/Arweave policy pinning; WASM browser compilation |

---

## License

Licensed under either of [MIT](LICENSE) or [Apache-2.0](LICENSE) at your option.
