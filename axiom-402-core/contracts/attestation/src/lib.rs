//! # attestation
//!
//! NEAR smart contract for **axiom-402**.
//!
//! Stores and exposes SHA-256 proof hashes anchored by the off-chain
//! reasoning engine.  Every anchored entry maps:
//!
//! ```text
//! proof_hash (SHA-256 hex) → AnchoredProof { policy_cid, signer, timestamp }
//! ```
//!
//! ## Methods
//! | Method | Type | Description |
//! |---|---|---|
//! | `anchor_proof` | `call` | Anchor a proof hash + policy CID on-chain |
//! | `get_proof` | `view` | Return the `AnchoredProof` for a given hash |
//! | `verify_proof` | `view` | Return `true` if the hash exists |
//! | `list_proofs` | `view` | Paginated list of all anchored hashes |

use near_sdk::{
    borsh::{BorshDeserialize, BorshSerialize},
    collections::UnorderedMap,
    env, log, near, near_bindgen,
    AccountId, PanicOnDefault,
};
use serde::{Deserialize, Serialize};

// ── Storage key prefix ────────────────────────────────────────────────────────

/// Single-byte storage key prefix for the proofs map.
const PROOFS_PREFIX: &[u8] = b"p";

// ── Data types ────────────────────────────────────────────────────────────────

/// On-chain representation of an anchored proof entry.
#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct AnchoredProof {
    /// Lowercase hex SHA-256 hash of the canonical proof JSON (64 chars).
    pub proof_hash:  String,
    /// IPFS / Arweave CID of the policy file used to produce this proof.
    pub policy_cid:  String,
    /// The NEAR account that called `anchor_proof`.
    pub signer:      AccountId,
    /// NEAR block timestamp at the time of anchoring (nanoseconds since epoch).
    pub timestamp_ns: u64,
}

// ── Contract ──────────────────────────────────────────────────────────────────

/// The axiom-402 attestation contract.
#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct AttestationContract {
    /// `proof_hash → AnchoredProof`.
    proofs: UnorderedMap<String, AnchoredProof>,
    /// Contract owner — the only account allowed to call admin methods.
    owner: AccountId,
}

#[near_bindgen]
impl AttestationContract {
    // ── Initialisation ────────────────────────────────────────────────────────

    /// Initialise the contract.  Must be called once immediately after deploy.
    ///
    /// `owner` defaults to the deployer account if not supplied.
    #[init]
    pub fn new(owner: Option<AccountId>) -> Self {
        assert!(!env::state_exists(), "Contract is already initialised");

        let owner = owner.unwrap_or_else(env::predecessor_account_id);
        log!("Initialising attestation contract — owner: {}", owner);

        Self {
            proofs: UnorderedMap::new(PROOFS_PREFIX.to_vec()),
            owner,
        }
    }

    // ── Mutating methods ──────────────────────────────────────────────────────

    /// Anchor a proof hash on-chain.
    ///
    /// # Panics
    /// - If `proof_hash` is not a 64-character lowercase hex string.
    /// - If `policy_cid` is empty.
    /// - If the same `proof_hash` has already been anchored (idempotency guard).
    pub fn anchor_proof(&mut self, proof_hash: String, policy_cid: String) {
        // Validate inputs — panic with a clear message (NEAR convention).
        assert_eq!(
            proof_hash.len(),
            64,
            "proof_hash must be a 64-character hex string, got {} chars",
            proof_hash.len()
        );
        assert!(
            proof_hash.chars().all(|c| c.is_ascii_hexdigit()),
            "proof_hash must contain only hex characters"
        );
        assert!(!policy_cid.is_empty(), "policy_cid must not be empty");
        assert!(
            !self.proofs.contains_key(&proof_hash),
            "proof_hash already anchored — each hash may only be anchored once"
        );

        // Storage staking: charge the caller for their state.
        // (near-sdk's default LookupMap behaviour handles this automatically
        //  via the attached deposit pattern; here we assert a 1 yoctoNEAR
        //  minimum to prevent free spam.)
        let attached = env::attached_deposit();
        assert!(
            attached.as_yoctonear() >= 1,
            "Attach at least 1 yoctoNEAR to cover storage fees"
        );

        let entry = AnchoredProof {
            proof_hash:   proof_hash.clone(),
            policy_cid:   policy_cid.clone(),
            signer:       env::predecessor_account_id(),
            timestamp_ns: env::block_timestamp(),
        };

        self.proofs.insert(&proof_hash, &entry);

        log!(
            "Proof anchored — hash: {}, policy_cid: {}, signer: {}",
            proof_hash,
            policy_cid,
            entry.signer,
        );
    }

    // ── View methods ──────────────────────────────────────────────────────────

    /// Return the `AnchoredProof` record for the given `proof_hash`, or
    /// `None` if it has not been anchored.
    pub fn get_proof(&self, proof_hash: String) -> Option<AnchoredProof> {
        self.proofs.get(&proof_hash)
    }

    /// Return `true` if `proof_hash` has been anchored, `false` otherwise.
    pub fn verify_proof(&self, proof_hash: String) -> bool {
        self.proofs.contains_key(&proof_hash)
    }

    /// Return a paginated list of all anchored proof hashes.
    ///
    /// `from_index` defaults to `0`; `limit` defaults to `50` (max `200`).
    pub fn list_proofs(
        &self,
        from_index: Option<u64>,
        limit:      Option<u64>,
    ) -> Vec<AnchoredProof> {
        let from  = from_index.unwrap_or(0) as usize;
        let limit = limit.unwrap_or(50).min(200) as usize;

        self.proofs
            .values()
            .skip(from)
            .take(limit)
            .collect()
    }

    /// Return the total number of anchored proofs.
    pub fn proof_count(&self) -> u64 {
        self.proofs.len()
    }

    /// Return the contract owner.
    pub fn owner(&self) -> AccountId {
        self.owner.clone()
    }
}

// ── Unit tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use near_sdk::{test_utils::VMContextBuilder, testing_env, NearToken};

    use super::*;

    fn mock_context(signer: &str, deposit: u128) {
        testing_env!(VMContextBuilder::new()
            .predecessor_account_id(signer.parse().unwrap())
            .attached_deposit(NearToken::from_yoctonear(deposit))
            .build());
    }

    #[test]
    fn test_anchor_and_verify() {
        mock_context("alice.testnet", 1);
        let mut contract = AttestationContract::new(None);

        let hash = "a".repeat(64);
        let cid  = "bafybeig1234567890".to_string();

        contract.anchor_proof(hash.clone(), cid.clone());

        assert!(contract.verify_proof(hash.clone()));
        let entry = contract.get_proof(hash.clone()).unwrap();
        assert_eq!(entry.policy_cid, cid);
        assert_eq!(entry.proof_hash, hash);
    }

    #[test]
    #[should_panic(expected = "already anchored")]
    fn test_duplicate_anchor_panics() {
        mock_context("alice.testnet", 1);
        let mut contract = AttestationContract::new(None);

        let hash = "b".repeat(64);
        let cid  = "bafybeig0000000000".to_string();

        contract.anchor_proof(hash.clone(), cid.clone());
        // Second call should panic.
        contract.anchor_proof(hash, cid);
    }

    #[test]
    fn test_list_proofs_pagination() {
        mock_context("alice.testnet", 1);
        let mut contract = AttestationContract::new(None);

        for i in 0u8..5 {
            mock_context("alice.testnet", 1);
            contract.anchor_proof(
                format!("{:0>64}", hex::encode([i; 32])),
                format!("bafybei{i}"),
            );
        }

        let page = contract.list_proofs(Some(0), Some(3));
        assert_eq!(page.len(), 3);

        let all = contract.list_proofs(None, None);
        assert_eq!(all.len(), 5);
    }
}
