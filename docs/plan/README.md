# SuperDemocracy plan docs

Living vision and architecture for collaborators (humans and agents). More documents will be added here over time.

**Start here:** [north-star.md](north-star.md) (short) · [governance-principles.md](governance-principles.md) (durable principles) · [master-plan.md](master-plan.md) (full) · [todo.md](todo.md) (what is still open).

| File | What it is |
|------|------------|
| `constitution.md` | Project constitution — highest authority. **Not yet committed** (handoff zip pending, see [todo.md](todo.md)) |
| [north-star.md](north-star.md) | What SuperDemocracy is trying to become |
| [governance-principles.md](governance-principles.md) | Durable governance principles (v0.1 in repo; v0.2 pending from handoff) |
| [master-plan.md](master-plan.md) | Combined working reference |
| [system-specification.md](system-specification.md) | What the software must do |
| [security-architecture.md](security-architecture.md) | Privacy and verification rules |
| `governance-measurement.md` | How we tell whether governance is getting better. **Not yet committed** (handoff pending) |
| [research-and-decisions.md](research-and-decisions.md) | Research threads and the original decisions 001–014 |
| [../DECISION-LOG.md](../DECISION-LOG.md) | Running decision log — newer decisions and code/doc conflicts |
| [todo.md](todo.md) | Open questions and work not yet done |

## Authority when documents conflict

Order set by the 2026-09-08 handoff (decision D-2026-09-09-02):

1. **Constitution**
2. **Governance principles**
3. **Master plan** and **system specification**
4. The founding manuscript
5. **Decision log**
6. **Implementation** (the code)

The code describes what *exists*. It does not outrank the vision. When code and a document disagree, record it in [../DECISION-LOG.md](../DECISION-LOG.md) and decide — never silently pick a side, and never delete working features to match a narrower document.

Always preserve **democratic sovereignty** and **vote secrecy**.

## Local chain

Anvil for this project runs at `http://127.0.0.1:8546`, chain id `31338` (not the Anvil defaults). Verify the running node before debugging the frontend. Deploy with `contracts/deploy.sh` (`cast send`), never `forge create`.

Do not commit local Anvil keys or other dev-only credentials.
