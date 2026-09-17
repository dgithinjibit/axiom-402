use serde::Deserialize;

use crate::error::SettlementError;

/// Runtime configuration for the NEAR settlement client.
///
/// All values can be supplied via environment variables (with the
/// `AXIOM_` prefix) or a `config.toml` / `config.yaml` file in the
/// current working directory.
///
/// | Field | Env var | Default |
/// |---|---|---|
/// | `rpc_url` | `AXIOM_NEAR_RPC_URL` | `https://rpc.testnet.near.org` |
/// | `contract_id` | `AXIOM_CONTRACT_ID` | — (required) |
/// | `signer_account_id` | `AXIOM_SIGNER_ACCOUNT_ID` | — (required) |
/// | `signer_private_key` | `AXIOM_SIGNER_PRIVATE_KEY` | — (required) |
/// | `network_id` | `AXIOM_NETWORK_ID` | `testnet` |
#[derive(Debug, Clone, Deserialize)]
pub struct SettlementConfig {
    /// NEAR JSON-RPC endpoint.
    #[serde(default = "defaults::rpc_url")]
    pub rpc_url: String,

    /// Account ID of the deployed attestation contract.
    pub contract_id: String,

    /// Account ID used to sign transactions.
    pub signer_account_id: String,

    /// Ed25519 private key in `ed25519:<base58>` format.
    ///
    /// **Never log this value.**
    pub signer_private_key: String,

    /// NEAR network identifier (`testnet` | `mainnet`).
    #[serde(default = "defaults::network_id")]
    pub network_id: String,
}

impl SettlementConfig {
    /// Load configuration from environment variables and optional config files.
    ///
    /// # Errors
    /// Returns [`SettlementError::Config`] if required fields are missing.
    pub fn from_env() -> Result<Self, SettlementError> {
        dotenvy::dotenv().ok(); // .env file is optional

        let cfg = config::Config::builder()
            .add_source(
                config::Environment::with_prefix("AXIOM")
                    .separator("_")
                    .try_parsing(true),
            )
            .add_source(config::File::with_name("config").required(false))
            .build()
            .map_err(|e| SettlementError::Config(e.to_string()))?;

        cfg.try_deserialize::<Self>()
            .map_err(|e| SettlementError::Config(e.to_string()))
    }
}

mod defaults {
    pub fn rpc_url() -> String {
        "https://rpc.testnet.near.org".into()
    }

    pub fn network_id() -> String {
        "testnet".into()
    }
}
