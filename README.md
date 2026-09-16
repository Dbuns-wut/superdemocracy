# SuperDemocracy

Civic governance app: community organizations, petitions, polls, and votes. Optional on-chain organizations and referendums via Foundry contracts.

**Vision:** [Constitution](docs/plan/constitution.md) · [north star](docs/plan/north-star.md) · [governance principles](docs/plan/governance-principles.md) · [master plan](docs/plan/master-plan.md). Read order and authority: [docs/plan/README.md](docs/plan/README.md). Why things are the way they are: [docs/DECISION-LOG.md](docs/DECISION-LOG.md).

## Setup

Needs Node.js 20+ and npm.

```bash
git clone https://github.com/Dbuns-wut/superdemocracy.git
cd superdemocracy
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Community orgs, polls, and votes work from JSON files under `data/` with no Docker or Postgres.

Copy `.env.example` to `.env.local` if you need optional contract addresses, Postgres, or ballot encryption.

This repo’s local original is a native Windows clone of GitHub (same pattern as Quoter). Do not keep a second WSL copy as source of truth.

### Postgres (optional)

Without `DATABASE_URL`, data stays in `data/`. With Postgres:

```bash
docker compose up -d
# set DATABASE_URL and BALLOT_ENCRYPTION_KEY in .env.local
npm run db:migrate
npm run dev
```

### Contracts (optional)

On-chain group/registry screens need a local Anvil node and the contracts in [`contracts/`](contracts/). You can ignore that until you work on those screens.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Copyright (c) 2026 Dustin Murray.

This is **source available**, not open source. You may read the code, fork, contribute, and run it locally to try it. You may **not** host it for real members or real votes without a commercial license from Dustin Murray.

- Terms: [LICENSE](LICENSE)
- How to ask about paid use: [COMMERCIAL.md](COMMERCIAL.md)
