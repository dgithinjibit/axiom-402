//! Low-level NEAR JSON-RPC client.
//!
//! Wraps `reqwest` with typed request/response structs so that the higher
//! level [`crate::client::NearSettlementClient`] never has to touch raw JSON.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tracing::{debug, instrument};

use crate::{config::SettlementConfig, error::SettlementError};

// ── JSON-RPC request / response envelope ─────────────────────────────────────

#[derive(Serialize)]
struct JsonRpcRequest<'a> {
    jsonrpc: &'static str,
    id:      &'static str,
    method:  &'a str,
    params:  Value,
}

#[derive(Deserialize)]
struct JsonRpcEnvelope {
    #[serde(default)]
    result: Option<Value>,
    #[serde(default)]
    error:  Option<RpcError>,
}

#[derive(Deserialize)]
struct RpcError {
    code:    i64,
    message: String,
}

// ── RPC client ────────────────────────────────────────────────────────────────

/// Thin async wrapper around the NEAR JSON-RPC HTTP endpoint.
#[derive(Clone)]
pub struct RpcClient {
    http:    reqwest::Client,
    rpc_url: String,
}

impl RpcClient {
    /// Construct a new client from configuration.
    pub fn new(cfg: &SettlementConfig) -> Self {
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            // reqwest::Client::build() only fails if TLS is broken, which is a
            // programmer error — treat as unrecoverable.
            .unwrap_or_default();

        Self {
            http,
            rpc_url: cfg.rpc_url.clone(),
        }
    }

    /// Execute a raw JSON-RPC call and return the `result` field.
    ///
    /// # Errors
    /// Returns [`SettlementError::Rpc`] on transport failures,
    /// [`SettlementError::RpcResponse`] on RPC-level errors.
    #[instrument(skip(self, params), fields(method = %method))]
    pub async fn call(
        &self,
        method: &str,
        params: Value,
    ) -> Result<Value, SettlementError> {
        let body = JsonRpcRequest {
            jsonrpc: "2.0",
            id:      "axiom-402",
            method,
            params,
        };

        debug!(url = %self.rpc_url, method, "Sending JSON-RPC request");

        let resp: JsonRpcEnvelope = self
            .http
            .post(&self.rpc_url)
            .json(&body)
            .send()
            .await?
            .json()
            .await?;

        if let Some(err) = resp.error {
            return Err(SettlementError::RpcResponse {
                code:    err.code,
                message: err.message,
            });
        }

        resp.result
            .ok_or_else(|| SettlementError::Internal("RPC returned neither result nor error".into()))
    }
}
