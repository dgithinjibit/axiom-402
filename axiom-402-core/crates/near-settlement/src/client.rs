//! High-level NEAR settlement client.
//!
//! Responsible for:
//! 1. Validating the proof hash.
//! 2. Constructing a `FunctionCall` transaction to `attestation::anchor_proof`.
//! 3. Signing it with the configured key and broadcasting via the RPC.
//! 4. Polling for the receipt outcome and returning the transaction hash.
//!
//! **Phase 1 (scaffold):** The signing logic calls the NEAR RPC `broadcast_tx_async`
//! endpoint with a pre-signed transaction.  Full Chain Signatures integration
//! (MPC-based key derivation) will be added in Phase 2.

use serde_json::json;
use tracing::{info, instrument};

use crate::{
    config::SettlementConfig,
    error::SettlementError,
    rpc::RpcClient,
    types::{AnchorRequest, AnchorReceipt},
};

/// Client for anchoring proof hashes on NEAR.
pub struct NearSettlementClient {
    rpc:    RpcClient,
    config: SettlementConfig,
}

impl NearSettlementClient {
    /// Construct a new client from a validated config.
    pub fn new(config: SettlementConfig) -> Self {
        let rpc = RpcClient::new(&config);
        Self { rpc, config }
    }

    /// Construct from environment / config file (convenience constructor).
    ///
    /// # Errors
    /// Forwards [`SettlementError::Config`] if required env vars are absent.
    pub fn from_env() -> Result<Self, SettlementError> {
        let config = SettlementConfig::from_env()?;
        Ok(Self::new(config))
    }

    /// Anchor a proof hash on-chain via the `attestation` contract.
    ///
    /// Calls `anchor_proof(proof_hash, policy_cid)` on the configured
    /// contract account.
    ///
    /// # Errors
    /// - [`SettlementError::InvalidProofHash`] — hash is empty or not a
    ///   64-char hex string.
    /// - [`SettlementError::Rpc`] / [`SettlementError::RpcResponse`] — NEAR
    ///   RPC transport or protocol error.
    /// - [`SettlementError::TransactionFailed`] — receipt reports failure.
    #[instrument(skip(self), fields(
        proof_hash  = %request.proof_hash,
        policy_cid  = %request.policy_cid,
        contract_id = %self.config.contract_id,
    ))]
    pub async fn anchor_proof(
        &self,
        request: AnchorRequest,
    ) -> Result<AnchorReceipt, SettlementError> {
        // ── Validate inputs ──────────────────────────────────────────────────
        if request.proof_hash.len() != 64
            || !request.proof_hash.chars().all(|c| c.is_ascii_hexdigit())
        {
            return Err(SettlementError::InvalidProofHash(request.proof_hash.clone()));
        }

        info!(
            proof_hash = %request.proof_hash,
            policy_cid = %request.policy_cid,
            "Anchoring proof on NEAR"
        );

        // ── Build the function-call args ─────────────────────────────────────
        //
        // NOTE: Phase 1 uses `broadcast_tx_async` with a pre-built payload
        // constructed via the NEAR JSON-RPC params directly.  Phase 2 will
        // replace this with proper transaction signing using near-crypto and
        // Chain Signatures (MPC).
        //
        // The `args_base64` field is the base64-encoded JSON of the contract
        // method arguments.
        let method_args = json!({
            "proof_hash": request.proof_hash,
            "policy_cid": request.policy_cid,
        });
        let args_base64 = base64_encode(serde_json::to_vec(&method_args)?);

        // Query the signer's current nonce + block hash (required for tx).
        let access_key = self
            .rpc
            .call(
                "query",
                json!({
                    "request_type": "view_access_key",
                    "finality": "final",
                    "account_id": self.config.signer_account_id,
                    "public_key": derive_public_key(&self.config.signer_private_key)?,
                }),
            )
            .await?;

        let nonce = access_key
            .get("nonce")
            .and_then(|v| v.as_u64())
            .ok_or_else(|| SettlementError::Internal("Missing nonce in access_key response".into()))?
            + 1;

        let block_hash = access_key
            .get("block_hash")
            .and_then(|v| v.as_str())
            .ok_or_else(|| SettlementError::Internal("Missing block_hash in access_key response".into()))?
            .to_owned();

        // Broadcast the transaction.  Phase 1 builds the signed tx payload
        // via the NEAR transaction signing helper.
        let signed_tx_base64 = build_and_sign_transaction(
            &self.config,
            nonce,
            &block_hash,
            &self.config.contract_id,
            "anchor_proof",
            &args_base64,
        )?;

        let result = self
            .rpc
            .call("broadcast_tx_async", json!([signed_tx_base64]))
            .await?;

        let tx_hash = result
            .as_str()
            .ok_or_else(|| SettlementError::Internal("Expected transaction hash string".into()))?
            .to_owned();

        info!(tx_hash = %tx_hash, "Transaction submitted");

        Ok(AnchorReceipt {
            tx_hash,
            proof_hash: request.proof_hash,
            policy_cid: request.policy_cid,
        })
    }
}

// ── Internal helpers (Phase 1 stubs) ─────────────────────────────────────────
//
// These will be replaced with full near-crypto signing in Phase 2.

/// Derive the public key string from a private key in `ed25519:<base58>` form.
fn derive_public_key(private_key: &str) -> Result<String, SettlementError> {
    // Phase 1: parse prefix, validate format, return placeholder.
    // Phase 2: use `near-crypto` crate to properly derive the public key.
    if !private_key.starts_with("ed25519:") {
        return Err(SettlementError::Config(
            "signer_private_key must start with 'ed25519:'".into(),
        ));
    }
    // TODO(phase-2): replace with actual derivation via near-crypto.
    Ok(format!("ed25519:{}", &private_key["ed25519:".len()..]))
}

/// Build and sign a NEAR `FunctionCall` transaction.
///
/// Phase 1: returns a placeholder base64-encoded signed transaction.
/// Phase 2: use `near-crypto` + borsh to produce the real signed bytes.
fn build_and_sign_transaction(
    config:       &SettlementConfig,
    nonce:        u64,
    block_hash:   &str,
    receiver_id:  &str,
    method_name:  &str,
    args_base64:  &str,
) -> Result<String, SettlementError> {
    // TODO(phase-2): replace with real borsh-serialised + ed25519-signed tx.
    //
    // For now we emit a clearly labelled stub so that Phase 1 `cargo check`
    // passes and integration tests can be wired once near-crypto is added.
    let _ = (config, nonce, block_hash, receiver_id, method_name, args_base64);

    Err(SettlementError::Internal(
        "build_and_sign_transaction: Phase 2 not yet implemented — \
         integrate near-crypto for real transaction signing".into(),
    ))
}

/// Standard base64 encoding (no padding variant used by NEAR is standard
/// base64 with padding).
fn base64_encode(bytes: Vec<u8>) -> String {
    use std::fmt::Write as _;
    // Manual base64: in Phase 2 pull in the `base64` crate.
    // For Phase 1 scaffold this is acceptable as a placeholder.
    let mut out = String::new();
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut i = 0;
    while i < bytes.len() {
        let b0 = bytes[i] as usize;
        let b1 = if i + 1 < bytes.len() { bytes[i + 1] as usize } else { 0 };
        let b2 = if i + 2 < bytes.len() { bytes[i + 2] as usize } else { 0 };
        let _ = write!(
            out,
            "{}{}{}{}",
            CHARS[b0 >> 2] as char,
            CHARS[((b0 & 3) << 4) | (b1 >> 4)] as char,
            if i + 1 < bytes.len() { CHARS[((b1 & 15) << 2) | (b2 >> 6)] as char } else { '=' },
            if i + 2 < bytes.len() { CHARS[b2 & 63] as char } else { '=' },
        );
        i += 3;
    }
    out
}
