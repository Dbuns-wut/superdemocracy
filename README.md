# SuperDemocracy

Civic governance app: community organizations, petitions, polls, and votes. Optional on-chain organizations and referendums via Foundry contracts.

## Setup

Needs Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Community orgs, polls, and votes work from JSON files under `data/` with no Docker or Postgres.

Copy `.env.example` to `.env.local` if you need optional contract addresses, Postgres, or ballot encryption.

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

A license has not been chosen yet. **Do not make this GitHub repository public until a `LICENSE` file is added.**
