//! # axiom CLI
//!
//! Developer-facing CLI for **axiom-402**.
//!
//! ## Commands
//! | Command | Description |
//! |---|---|
//! | `axiom derive` | Load a `.metta` policy, run a spend-request derivation, and print the proof tree + hash |
//! | `axiom anchor` | Take a proof hash and anchor it to the NEAR attestation contract |
//! | `axiom prove-and-anchor` | Derive then anchor in one shot |

#![forbid(unsafe_code)]
#![deny(clippy::all, clippy::pedantic, clippy::unwrap_used)]

mod commands;

use anyhow::Result;
use clap::Parser;
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

use commands::{Cli, Command};

#[tokio::main]
async fn main() -> Result<()> {
    init_tracing();

    let cli = Cli::parse();
    cli.command.run().await
}

/// Initialise the `tracing` subscriber.
///
/// Log level is controlled by the `AXIOM_LOG` env var (falls back to `info`).
/// JSON output is enabled when `AXIOM_LOG_JSON=true`.
fn init_tracing() {
    dotenvy::dotenv().ok();

    let filter = EnvFilter::try_from_env("AXIOM_LOG")
        .unwrap_or_else(|_| EnvFilter::new("info"));

    let use_json = std::env::var("AXIOM_LOG_JSON")
        .map(|v| v.eq_ignore_ascii_case("true"))
        .unwrap_or(false);

    if use_json {
        tracing_subscriber::registry()
            .with(filter)
            .with(fmt::layer().json())
            .init();
    } else {
        tracing_subscriber::registry()
            .with(filter)
            .with(fmt::layer().with_target(false).compact())
            .init();
    }
}
