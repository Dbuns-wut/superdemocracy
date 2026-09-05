# Data storage

By default the app stores community orgs, petitions, polls, votes, and related records as JSON files under `data/`. Those files are gitignored so local/dev data is not committed.

To use Postgres instead, set `DATABASE_URL` (see `.env.example` and `docker-compose.yml`) and run:

```bash
npm run db:migrate
```

Encrypted ballots also need `BALLOT_ENCRYPTION_KEY`.
