use serde::{Deserialize, Serialize};

/// Input to [`crate::client::NearSettlementClient::anchor_proof`].
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnchorRequest {
    /// The lowercase hex SHA-256 hash of the canonical proof JSON (64 chars).
    pub proof_hash: String,
    /// The IPFS / Arweave CID of the policy file used to produce the proof.
    pub policy_cid: String,
}

/// Successful result from anchoring a proof on-chain.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnchorReceipt {
    /// NEAR transaction hash (base58).
    pub tx_hash:    String,
    /// The proof hash that was anchored.
    pub proof_hash: String,
    /// The policy CID that was anchored.
    pub policy_cid: String,
}
