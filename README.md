# SuperDemocracy

Civic governance app: organizations, members, polls, and votes with encrypted ballots, Education Before Vote, and an appointed-counter review. Sign up with email and password; nothing else to install.

**Vision:** [Constitution](docs/plan/constitution.md). Read order and authority: [docs/plan/README.md](docs/plan/README.md). Why things are the way they are: [docs/DECISION-LOG.md](docs/DECISION-LOG.md).

## Setup

Needs Node.js 20+ and npm.

```bash
git clone https://github.com/Dbuns-wut/superdemocracy.git
cd superdemocracy
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Organizations, polls, and votes work from JSON files under `data/` with no Docker or Postgres.

Copy `.env.example` to `.env.local` and set `BALLOT_ENCRYPTION_KEY` (any long random string) before casting votes. Add `DATABASE_URL` only if you want Postgres.

This repo’s local original is a native Windows clone of GitHub (same pattern as Quoter). Do not keep a second WSL copy as source of truth.

### Postgres (optional)

Without `DATABASE_URL`, data stays in `data/`. With Postgres:

```bash
docker compose up -d
# set DATABASE_URL and BALLOT_ENCRYPTION_KEY in .env.local
npm run db:migrate
npm run dev
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Copyright (c) 2026 Dustin Murray.

This is **source available**, not open source. You may read the code, fork, contribute, and run it locally to try it. You may **not** host it for real members or real votes without a commercial license from Dustin Murray.

- Terms: [LICENSE](LICENSE)
- How to ask about paid use: [COMMERCIAL.md](COMMERCIAL.md)
