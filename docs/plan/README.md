# SuperDemocracy plan docs

The canonical vision and architecture set for collaborators (humans and agents). Imported from the 2026-09-08 handoff package; this folder is now the only copy that matters.

**Do not start redesigning or adding features before reading these.** The project contains deliberate governance choices whose purpose is not obvious from code alone. If a major question is not resolved here, ask the Chief Architect (Dustin Murray) rather than inventing a conclusion.

## Read order

1. [constitution.md](constitution.md)
2. [north-star.md](north-star.md)
3. [governance-principles.md](governance-principles.md)
4. [master-plan.md](master-plan.md)
5. [system-specification.md](system-specification.md)
6. [security-architecture.md](security-architecture.md)
7. [governance-measurement.md](governance-measurement.md)
8. [../DECISION-LOG.md](../DECISION-LOG.md)
9. [../../CONTRIBUTING.md](../../CONTRIBUTING.md)

Then the books for deeper context, shortest first: [project primer](../books/superdemocracy-project-primer.md) → [condensed book](../books/superdemocracy-the-experiment-condensed.md) → [full manuscript](../books/superdemocracy-full-manuscript.md).

Open work lists live on the project whiteboard. The repo pointer is [todo.md](todo.md).

| File | What it is |
|------|------------|
| [constitution.md](constitution.md) | Project constitution. A starting document (D-2026-10-29-02) |
| [north-star.md](north-star.md) | What SuperDemocracy is trying to become |
| [governance-principles.md](governance-principles.md) | Durable governance principles (v0.3) |
| [master-plan.md](master-plan.md) | The single master document. If you open one file, open this one |
| [system-specification.md](system-specification.md) | What the software must do |
| [security-architecture.md](security-architecture.md) | Privacy and verification rules |
| [governance-measurement.md](governance-measurement.md) | How we tell whether governance is getting better |
| [research-and-decisions.md](research-and-decisions.md) | Research threads and the original decisions 001–014 |
| [../DECISION-LOG.md](../DECISION-LOG.md) | Accepted decisions and the reasoning behind them |
| [todo.md](todo.md) | Pointer to the project whiteboard (Superdemocracy launch lists) |
| [../books/](../books/README.md) | Founding manuscript, condensed book, project primer |

## Authority when documents conflict

From the Constitution, Article XI, as updated by D-2026-10-29-02:

1. **Decision log** — a later accepted entry wins over the starting documents, after a warning and an explicit decision to override
2. **Starting documents** — Constitution, governance principles, North Star, and Master Plan. They can become outdated
3. **System specification**, security architecture, and governance measurement
4. Founding manuscript
5. **Implementation** and technical documentation
6. Historical prompts, chats, drafts, superseded documents

If a proposed decision conflicts with a starting document, warn the Chief Architect. The Chief Architect decides whether to override it. If the override goes ahead, the decision log entry holds the discussion summary and the reasons, and the clause is footnoted "amended by decision #x".

The code describes what *exists*. It does not outrank the vision. When code and a document disagree, record it in [../DECISION-LOG.md](../DECISION-LOG.md) and decide — never silently pick a side, and never delete working features to match a narrower document.

Always preserve **democratic sovereignty**. Blockchain votes default to auditor-visible records. A secret count is an organization choice, and the tally stays public either way.

## Local chain

Anvil for this project runs at `http://127.0.0.1:8546`, chain id `31338` (not the Anvil defaults — decision D-2026-09-09-03). Verify the running node before debugging the frontend. Deploy with `contracts/deploy.sh` (`cast send`), never `forge create`.

Do not commit local Anvil keys or other dev-only credentials.
