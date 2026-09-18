import type { Metadata } from "next";
import Link from "next/link";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Boxes, Hash, Shield, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Docs — axiom-402",
  description: "Learn how axiom-402 gives autonomous AI agents verifiable economic reasoning on NEAR Protocol.",
};

const QUICKSTART = `# 1. Add the crate to your agent's Cargo.toml
[dependencies]
reasoning-engine = { git = "https://github.com/your-org/axiom-402", package = "reasoning-engine" }
near-settlement   = { git = "https://github.com/your-org/axiom-402", package = "near-settlement"  }

# 2. Load your policy and derive a proof
use reasoning_engine::{ReasoningEngine, hash_proof, SpendRequest};

let engine = ReasoningEngine::load("policy.metta")?;
let proof  = engine.derive_proof(&SpendRequest {
    amount:   2.0,
    purpose:  "weather-data".into(),
    metadata: Default::default(),
})?;
let hashed = hash_proof(proof)?;

# 3. Anchor the hash on NEAR
use near_settlement::{NearSettlementClient, AnchorRequest};

let client  = NearSettlementClient::from_env()?;
let receipt = client.anchor_proof(AnchorRequest {
    proof_hash: hashed.proof_hash,
    policy_cid: "bafybeig…".into(),
}).await?;

println!("Anchored at tx: {}", receipt.tx_hash);`;

const FEATURES = [
  {
    icon:        <Boxes className="h-5 w-5" aria-hidden="true" />,
    title:       "Symbolic Reasoning",
    description: "Define spending policies as MeTTa rules. The engine derives a full proof tree from axioms to conclusion.",
  },
  {
    icon:        <Hash className="h-5 w-5" aria-hidden="true" />,
    title:       "Hash Anchoring",
    description: "The proof tree is serialised to canonical JSON and hashed with SHA-256. Tamper-evident by design.",
  },
  {
    icon:        <Shield className="h-5 w-5" aria-hidden="true" />,
    title:       "On-Chain Attestation",
    description: "The proof hash is anchored to NEAR Protocol via the attestation contract. Anyone can verify it.",
  },
  {
    icon:        <Zap className="h-5 w-5" aria-hidden="true" />,
    title:       "Pure Rust",
    description: "No Python. No EVM. Performance-native, WASM-compatible, and ready to compile to NEAR contracts.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-16">

      {/* Hero */}
      <section className="space-y-4 py-8 text-center">
        <div className="flex justify-center gap-2">
          <Badge variant="outline">MeTTa + NEAR Protocol</Badge>
          <Badge variant="secondary">Hackathon Prototype</Badge>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Verifiable Economic Reasoning<br />for Autonomous Agents
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          axiom-402 gives your AI agent a cryptographic receipt for every spend
          decision — proving <em>why</em> it spent money, not just <em>that</em> it did.
        </p>
        <div className="flex justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/playground">
              Try the Playground <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/verify">Verify a Proof</Link>
          </Button>
        </div>
      </section>

      {/* Feature cards */}
      <section aria-labelledby="features-heading">
        <h2 id="features-heading" className="mb-6 text-2xl font-semibold">
          How it works
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon, title, description }) => (
            <Card key={title}>
              <CardHeader className="pb-2">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  {icon}
                </div>
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Quickstart */}
      <section aria-labelledby="quickstart-heading">
        <h2 id="quickstart-heading" className="mb-4 text-2xl font-semibold">
          Quickstart
        </h2>
        <Card>
          <CardContent className="p-0">
            <pre className="overflow-x-auto rounded-lg bg-gray-950 p-6 text-sm text-gray-100">
              <code>{QUICKSTART}</code>
            </pre>
          </CardContent>
        </Card>
      </section>

      {/* Architecture */}
      <section aria-labelledby="arch-heading">
        <h2 id="arch-heading" className="mb-4 text-2xl font-semibold">
          Architecture
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              step: "1",
              title: "reasoning-engine",
              desc: "A Rust library crate. Loads .metta policies into a Hyperon AtomSpace and runs symbolic derivation queries.",
              lang: "Rust + MeTTa",
            },
            {
              step: "2",
              title: "near-settlement",
              desc: "A Rust library crate. Signs and broadcasts the anchor_proof transaction to NEAR testnet/mainnet.",
              lang: "Rust + NEAR SDK",
            },
            {
              step: "3",
              title: "attestation contract",
              desc: "A NEAR smart contract that stores proof hashes on-chain. Exposes verify_proof for anyone to check.",
              lang: "Rust + near-sdk-rs",
            },
          ].map(({ step, title, desc, lang }) => (
            <Card key={step}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {step}
                  </span>
                  <CardTitle className="text-base">{title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <CardDescription>{desc}</CardDescription>
                <Badge variant="outline" className="font-mono text-xs">{lang}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
