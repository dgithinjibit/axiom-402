//! # reasoning-engine
//!
//! MeTTa policy loading and proof-tree derivation for **axiom-402**.
//!
//! ## Usage
//! ```rust,no_run
//! use reasoning_engine::{ReasoningEngine, hash_proof, types::SpendRequest};
//!
//! let engine = ReasoningEngine::load("examples/policy.metta").unwrap();
//! let request = SpendRequest {
//!     amount:   2.0,
//!     purpose:  "weather-data".into(),
//!     metadata: Default::default(),
//! };
//! let tree        = engine.derive_proof(&request).unwrap();
//! let hashed_proof = hash_proof(tree).unwrap();
//! println!("proof_hash = {}", hashed_proof.proof_hash);
//! ```

#![forbid(unsafe_code)]
#![deny(
    clippy::all,
    clippy::pedantic,
    clippy::unwrap_used,
    clippy::expect_used,
    missing_docs
)]
#![allow(clippy::module_name_repetitions)]

pub mod engine;
pub mod error;
pub mod types;

// Re-export the public API surface.
pub use engine::{hash_proof, ReasoningEngine};
pub use error::EngineError;
pub use types::{HashedProof, ProofStep, ProofTree, SpendRequest};
