//! # near-settlement
//!
//! NEAR Protocol client for **axiom-402**.
//!
//! Responsible for signing and broadcasting the `anchor_proof` transaction
//! to the on-chain attestation contract.
//!
//! ## Quick start
//! ```rust,no_run
//! use near_settlement::{NearSettlementClient, types::AnchorRequest};
//!
//! #[tokio::main]
//! async fn main() -> anyhow::Result<()> {
//!     let client = NearSettlementClient::from_env()?;
//!     let receipt = client.anchor_proof(AnchorRequest {
//!         proof_hash: "abcdef01…".into(),
//!         policy_cid: "bafybeig…".into(),
//!     }).await?;
//!     println!("tx_hash = {}", receipt.tx_hash);
//!     Ok(())
//! }
//! ```

#![forbid(unsafe_code)]
#![deny(
    clippy::all,
    clippy::pedantic,
    clippy::unwrap_used,
    missing_docs
)]
#![allow(clippy::module_name_repetitions)]

pub mod client;
pub mod config;
pub mod error;
pub mod rpc;
pub mod types;

// Re-export the public API surface.
pub use client::NearSettlementClient;
pub use config::SettlementConfig;
pub use error::SettlementError;
pub use types::{AnchorReceipt, AnchorRequest};
