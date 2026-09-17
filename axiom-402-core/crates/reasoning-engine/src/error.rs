use thiserror::Error;

/// All errors that can originate from the reasoning engine.
#[derive(Debug, Error)]
pub enum EngineError {
    /// The `.metta` policy file could not be read from disk.
    #[error("Failed to read policy file '{path}': {source}")]
    PolicyRead {
        path:   String,
        #[source]
        source: std::io::Error,
    },

    /// The MeTTa source could not be parsed or loaded into the AtomSpace.
    #[error("MeTTa parse/load error: {0}")]
    MettaLoad(String),

    /// A required query returned no results (the policy does not permit the spend).
    #[error("Policy derivation returned no results for query: {query}")]
    DerivationEmpty { query: String },

    /// Serialisation of the proof tree to JSON failed.
    #[error("Failed to serialise proof tree: {0}")]
    Serialisation(#[from] serde_json::Error),

    /// Any other unexpected internal error.
    #[error("Internal engine error: {0}")]
    Internal(String),
}
