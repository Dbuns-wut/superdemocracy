# Contributing

Local source of truth is this GitHub clone. Work on a branch, open a pull request against `main`.

## Vision

Read [docs/plan/north-star.md](docs/plan/north-star.md) before changing product behavior. Full reference: [docs/plan/master-plan.md](docs/plan/master-plan.md). Current **code** is what exists; the plan is the intended direction.

- Do not invent product behavior, scope, or copy. Ask first.
- Member-facing UI should not expose blockchain jargon. See [docs/product-language-guide.md](docs/product-language-guide.md).
- Prefer finishing a flow over “Coming soon.”

## Run locally

```bash
npm install
npm run dev
```

See the README for optional Postgres and contracts.

## Engineering

- Inspect files, ABIs, and contract state before guessing.
- Contract addresses come from `.env.local` / `.env.example`. Do not hardcode them.
- Rules (contracts), data/evidence, and UI stay separate. Rules must not depend on the frontend.
- Identity stays separate from governance. Preserve raw ballots. Do not put complex tally logic inside `vote()`. Admins cannot change ballots or tallies.
- For local Anvil work: diagnose chain ID, bytecode (`cast code`), storage, ABI, then frontend — redeploy last. Prefer `cast send` over `forge create`.
- Make the smallest safe change.

## License

Do not make the GitHub repository public until a `LICENSE` file is added.
