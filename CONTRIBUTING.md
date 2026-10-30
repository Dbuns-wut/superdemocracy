# Contributing

Local source of truth is this GitHub clone. Work on a branch, open a pull request against `main`. The project is founder-led: the Chief Architect (Dustin Murray) approves canonical changes and public contributions.

## Before changing anything

1. Read [docs/plan/README.md](docs/plan/README.md) and the [Constitution](docs/plan/constitution.md).
2. Read [docs/plan/system-specification.md](docs/plan/system-specification.md), and [docs/plan/security-architecture.md](docs/plan/security-architecture.md) for security-sensitive work.
3. Check the current repository state before proposing edits.

Code is what exists; it does not outrank the vision documents. The Constitution is the rulebook. A later entry in [docs/DECISION-LOG.md](docs/DECISION-LOG.md) wins over it and the technical codes after a warning (D-2026-10-29-03). If a proposed decision conflicts with one of them, warn the Chief Architect before recording it. The Chief Architect decides whether to override. If the override goes ahead, the entry holds the discussion summary and the reasons, and the clause is footnoted "amended by decision #x". When code and a document disagree, add a log entry — do not silently pick a side, and do not remove a built feature to match a narrower document.

- Do not invent product behavior, scope, or copy. Ask first.
- Member-facing UI should not expose system internals. See [docs/product-language-guide.md](docs/product-language-guide.md).
- Prefer finishing a flow over “Coming soon.”

## Never guess

If the exact file, function, store layout, or surrounding code is unknown, inspect it first. Do not invent line numbers or assume a file structure.

## Run locally

```bash
npm install
npm run dev
```

See the README for optional Postgres.

## Server rules

- Rules must not depend on frontend behavior. Every privileged action is checked in the route handler or store.
- Identity stays separate from governance. The participant id is the signed-in account id, read from the session — never from the request body.
- Store auditor-visible sealed ballots (D-2026-10-09-01). Keep tally logic separate from ballot submission.
- Only the appointed counter reads ballots, only while verification is open. Log every such read.
- Admins cannot read, edit, or delete ballots or alter tallies.
- Secrets (`DATABASE_URL`, `BALLOT_ENCRYPTION_KEY`) stay server-only. Never `NEXT_PUBLIC_*`.

## Frontend rules

- Get the signed-in person from `useSession()`. Show people by name (`usePeople`, `PersonPicker`), not by id.
- Preserve React hook rules.
- Make the smallest safe change. Do not rewrite large blocks unless necessary.
- Never show success copy unless the server confirmed the action.

## Debugging

- Diagnose in this order: session → record state (org / vote / membership) → the server rule that refused → frontend state → `.next` cache. Avoid retry loops.

## Decision log

Add an entry to [docs/DECISION-LOG.md](docs/DECISION-LOG.md) when a future contributor would reasonably ask "why does SuperDemocracy work this way?" Minor implementation changes belong in Git history, not the log. Open questions are indexed from [docs/plan/todo.md](docs/plan/todo.md), which points at the project whiteboard.

## License

Copyright (c) 2026 Dustin Murray. See [LICENSE](LICENSE). By sending a pull request you give Dustin Murray the right to use and sell your contribution, including under a commercial license. Running SuperDemocracy for a real organization requires a paid license ([COMMERCIAL.md](COMMERCIAL.md)).
