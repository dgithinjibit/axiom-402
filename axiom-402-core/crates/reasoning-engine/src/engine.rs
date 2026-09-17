use std::path::Path;

use hyperon::{
    metta::{MeTTa, RunContext},
    space::DynSpace,
    Atom,
};
use sha2::{Digest, Sha256};
use tracing::{debug, info, instrument};

use crate::{
    error::EngineError,
    types::{HashedProof, ProofStep, ProofTree, SpendRequest},
};

// ── Engine ────────────────────────────────────────────────────────────────────

/// The core reasoning engine.
///
/// Holds a loaded MeTTa interpreter for a single policy file.  Cheaply
/// clonable — the underlying `DynSpace` is reference-counted.
#[derive(Clone)]
pub struct ReasoningEngine {
    metta:       MeTTa,
    policy_path: String,
}

impl ReasoningEngine {
    /// Load a `.metta` policy file into a fresh AtomSpace and return a ready
    /// engine.
    ///
    /// # Errors
    /// Returns [`EngineError::PolicyRead`] if the file cannot be opened, or
    /// [`EngineError::MettaLoad`] if the source fails to parse.
    #[instrument(fields(policy_path = %policy_path.as_ref().display()))]
    pub fn load(policy_path: impl AsRef<Path>) -> Result<Self, EngineError> {
        let path_str = policy_path
            .as_ref()
            .to_string_lossy()
            .to_string();

        let source = std::fs::read_to_string(policy_path.as_ref()).map_err(|e| {
            EngineError::PolicyRead {
                path:   path_str.clone(),
                source: e,
            }
        })?;

        info!(policy_path = %path_str, "Loading MeTTa policy");

        let metta = MeTTa::new_with_stdlib(DynSpace::new(
            hyperon::space::grounding::GroundingSpace::new(),
        ));

        // Run the policy source to populate the AtomSpace.
        let result = metta.run(RunContext::new(source.as_str()));
        if let Err(e) = result {
            return Err(EngineError::MettaLoad(e.to_string()));
        }

        Ok(Self {
            metta,
            policy_path: path_str,
        })
    }

    /// Derive a proof tree for the given spend request.
    ///
    /// Runs the MeTTa query `!(can-spend <amount> <purpose>)` against the
    /// loaded AtomSpace and captures the derivation trace.
    ///
    /// # Errors
    /// Returns [`EngineError::DerivationEmpty`] when the policy does not
    /// permit the spend, or [`EngineError::MettaLoad`] on interpreter errors.
    #[instrument(skip(self), fields(amount = request.amount, purpose = %request.purpose))]
    pub fn derive_proof(&self, request: &SpendRequest) -> Result<ProofTree, EngineError> {
        let query = format!(
            "!(can-spend {} \"{}\")",
            request.amount, request.purpose
        );

        debug!(query = %query, "Running MeTTa derivation query");

        let results = self
            .metta
            .run(RunContext::new(query.as_str()))
            .map_err(|e| EngineError::MettaLoad(e.to_string()))?;

        // Flatten results: MeTTa returns Vec<Vec<Atom>>
        let atoms: Vec<Atom> = results.into_iter().flatten().collect();

        if atoms.is_empty() {
            return Err(EngineError::DerivationEmpty {
                query: query.clone(),
            });
        }

        info!(
            num_atoms = atoms.len(),
            "Derivation succeeded — building proof tree"
        );

        // Build a structured proof tree from the atoms.
        let steps: Vec<ProofStep> = atoms
            .iter()
            .map(|atom| ProofStep {
                atom:     atom.to_string(),
                premises: vec![],   // Phase 1: flat list; Phase 2 will nest these
            })
            .collect();

        let conclusion = format!("(can-spend {} \"{}\")", request.amount, request.purpose);

        Ok(ProofTree {
            conclusion,
            steps,
            request: request.clone(),
        })
    }
}

// ── Hashing ───────────────────────────────────────────────────────────────────

/// Serialise a [`ProofTree`] to canonical JSON and compute its SHA-256 hash.
///
/// The canonical form uses `serde_json::to_string` (compact, no trailing
/// newline).  This is the value that gets anchored on-chain.
///
/// # Errors
/// Returns [`EngineError::Serialisation`] if the tree cannot be serialised.
pub fn hash_proof(tree: ProofTree) -> Result<HashedProof, EngineError> {
    let canonical_json = serde_json::to_string(&tree)?;

    let mut hasher = Sha256::new();
    hasher.update(canonical_json.as_bytes());
    let digest = hasher.finalize();
    let proof_hash = hex::encode(digest);

    debug!(proof_hash = %proof_hash, "Computed SHA-256 proof hash");

    Ok(HashedProof {
        canonical_json,
        proof_hash,
        tree,
    })
}
