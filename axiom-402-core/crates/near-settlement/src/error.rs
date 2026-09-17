use thiserror::Error;

/// All errors that can originate from the NEAR settlement layer.
#[derive(Debug, Error)]
pub enum SettlementError {
    /// Configuration value missing or malformed.
    #[error("Configuration error: {0}")]
    Config(String),

    /// An HTTP-level error talking to the NEAR JSON-RPC endpoint.
    #[error("NEAR RPC transport error: {0}")]
    Rpc(#[from] reqwest::Error),

    /// The RPC responded but returned a NEAR error object.
    #[error("NEAR RPC error (code {code}): {message}")]
    RpcResponse { code: i64, message: String },

    /// The transaction was submitted but the receipt indicates failure.
    #[error("Transaction failed on-chain: {reason}")]
    TransactionFailed { reason: String },

    /// Serialisation / deserialisation error.
    #[error("Serialisation error: {0}")]
    Serialisation(#[from] serde_json::Error),

    /// Proof hash was empty or malformed before submission.
    #[error("Invalid proof hash: {0}")]
    InvalidProofHash(String),

    /// Any other unexpected internal error.
    #[error("Internal settlement error: {0}")]
    Internal(String),
}
