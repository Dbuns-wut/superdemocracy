# SuperDemocracy plan docs

The Constitution is the rulebook. Read it before redesigning or adding features. If a major question is not resolved there, ask the Chief Architect (Dustin Murray) rather than inventing a conclusion.

## Read order

1. [constitution.md](constitution.md)
2. [system-specification.md](system-specification.md)
3. [security-architecture.md](security-architecture.md)
4. [governance-measurement.md](governance-measurement.md)
5. [../DECISION-LOG.md](../DECISION-LOG.md)
6. [../../CONTRIBUTING.md](../../CONTRIBUTING.md)

Then the books for deeper context, shortest first: [project primer](../books/superdemocracy-project-primer.md) → [condensed book](../books/superdemocracy-the-experiment-condensed.md) → [full manuscript](../books/superdemocracy-full-manuscript.md).

Open work lists live on the project whiteboard. The repo pointer is [todo.md](todo.md).

| File | What it is |
|------|------------|
| [constitution.md](constitution.md) | The rulebook. Numbered articles and sections (D-2026-10-29-03) |
| [system-specification.md](system-specification.md) | What the software must do |
| [security-architecture.md](security-architecture.md) | Privacy and verification rules |
| [governance-measurement.md](governance-measurement.md) | How we tell whether governance is getting better |
| [research-and-decisions.md](research-and-decisions.md) | Research threads and the original decisions 001–014 |
| [../DECISION-LOG.md](../DECISION-LOG.md) | Accepted decisions and the reasoning behind them |
| [todo.md](todo.md) | Pointer to the project whiteboard (Superdemocracy launch lists) |
| [../books/](../books/README.md) | Founding manuscript, condensed book, project primer |

## Authority when documents conflict

From the Constitution, Article XI, as amended by decision #41 (D-2026-10-29-03):

1. **Decision log** — a later accepted entry wins over the Constitution and the technical codes, after a warning and an explicit decision to override
2. **Constitution** — the rulebook. It can become outdated
3. **Technical codes** — system specification, security architecture, and governance measurement
4. Founding manuscript
5. **Implementation** and technical documentation
6. Historical prompts, chats, drafts, superseded documents

If a proposed decision conflicts with the Constitution or a technical code, warn the Chief Architect. The Chief Architect decides whether to override it. If the override goes ahead, the decision log entry holds the discussion summary and the reasons, and the clause is footnoted "amended by decision #x".

The code describes what *exists*. It does not outrank the vision. When code and a document disagree, record it in [../DECISION-LOG.md](../DECISION-LOG.md) and decide — never silently pick a side, and never delete working features to match a narrower document.

Always preserve **democratic sovereignty**. Votes default to auditor-visible records. A secret count is an organization choice made after a warning, and the tally stays public either way.

## Local development

`npm install`, then `npm run dev`. No chain, wallet, or extension is involved (decision #43, D-2026-10-30-01). Data lives in `data/*.json` unless `DATABASE_URL` is set. Set `BALLOT_ENCRYPTION_KEY` to cast ballots.

Do not commit `.env.local` or other dev-only credentials.
