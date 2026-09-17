use serde::{Deserialize, Serialize};

// ── Spend request ─────────────────────────────────────────────────────────────

/// A single spend request that an agent wants to make.
///
/// This is the input to the reasoning engine: "I want to spend `amount` NEAR
/// tokens for the given `purpose`."
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpendRequest {
    /// Amount in NEAR tokens (e.g. `2.5`).
    pub amount:  f64,
    /// Human-readable purpose string that must match an `(allowed-purpose …)`
    /// atom in the policy (e.g. `"weather-data"`).
    pub purpose: String,
    /// Optional free-form metadata forwarded into the proof tree.
    #[serde(default)]
    pub metadata: std::collections::HashMap<String, String>,
}

// ── Proof tree ────────────────────────────────────────────────────────────────

/// A single step in the derivation trace.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProofStep {
    /// The MeTTa atom or rule that was applied at this step.
    pub atom:  String,
    /// Child steps that were premises for this step.
    pub premises: Vec<ProofStep>,
}

/// The complete proof tree produced by the reasoning engine.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProofTree {
    /// The root atom / conclusion atom (e.g. `(can-spend 2.0 weather-data)`).
    pub conclusion: String,
    /// Full derivation trace from axioms to conclusion.
    pub steps: Vec<ProofStep>,
    /// The spend request that was proven.
    pub request: SpendRequest,
}

// ── Hashed proof ──────────────────────────────────────────────────────────────

/// Canonical JSON serialisation of the proof tree together with its SHA-256
/// hash — this hash is what gets anchored on-chain.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HashedProof {
    /// Canonical JSON of `ProofTree` (sorted keys, no trailing whitespace).
    pub canonical_json: String,
    /// Lowercase hex SHA-256 of `canonical_json`.
    pub proof_hash:     String,
    /// The proof tree itself (kept for convenience).
    pub tree:           ProofTree,
}
