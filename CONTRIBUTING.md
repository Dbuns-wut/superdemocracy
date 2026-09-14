# Contributing

Local source of truth is this GitHub clone. Work on a branch, open a pull request against `main`. The project is founder-led: the Chief Architect (Dustin Murray) approves canonical changes and public contributions.

## Before changing anything

1. Read [docs/plan/README.md](docs/plan/README.md) and follow its read order — at minimum the [Constitution](docs/plan/constitution.md), [north star](docs/plan/north-star.md), and [governance principles](docs/plan/governance-principles.md).
2. Read [docs/plan/system-specification.md](docs/plan/system-specification.md), and [docs/plan/security-architecture.md](docs/plan/security-architecture.md) for security-sensitive work.
3. Check the current repository state before proposing edits.

Code is what exists; it does not outrank the vision documents. When code and a document disagree, add an entry to [docs/DECISION-LOG.md](docs/DECISION-LOG.md) — do not silently pick a side, and do not remove a built feature to match a narrower document.

- Do not invent product behavior, scope, or copy. Ask first.
- Member-facing UI should not expose blockchain jargon. See [docs/product-language-guide.md](docs/product-language-guide.md).
- Prefer finishing a flow over “Coming soon.”

## Never guess

If the exact file, ABI, function, storage layout, or surrounding code is unknown, inspect it first. Do not invent line numbers or assume a file structure.

## Run locally

```bash
npm install
npm run dev
```

See the README for optional Postgres and contracts.

## Contract rules

- Rules must not depend on frontend behavior.
- Identity stays separate from governance.
- Preserve raw ballots. Keep tally logic separate from ballot submission; do not put complex tally logic inside `vote()`.
- Do not loop over all voters.
- Emit useful events.
- Admins cannot manipulate ballots or tallies.

## Frontend rules

- Never hardcode contract addresses. Read them from `.env.local` (template: `.env.example`).
- Preserve React hook rules.
- Make the smallest safe change. Do not rewrite large blocks unless necessary.

## Deployment and debugging

- Local Anvil: `http://127.0.0.1:8546`, chain id `31338`. Deploy with `contracts/deploy.sh` (`cast send`). **Never use `forge create`.**
- Verify bytecode with `cast code`. Do not redeploy unless the evidence requires it. After address changes, remove `.next` and rebuild.
- Diagnose in this order: chain ID / Anvil instance → bytecode → contract state → ABI → frontend reads/writes → caching → redeployment. Avoid retry loops.

## Decision log

Add an entry to [docs/DECISION-LOG.md](docs/DECISION-LOG.md) when a future contributor would reasonably ask "why does SuperDemocracy work this way?" Minor implementation changes belong in Git history, not the log. Open questions live in [docs/plan/todo.md](docs/plan/todo.md).

## License

Copyright (c) 2026 Dustin Murray. Public contributions are under [AGPL-3.0-or-later](LICENSE) unless a separate commercial license is agreed. See [COMMERCIAL.md](COMMERCIAL.md).
