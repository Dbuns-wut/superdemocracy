# SuperDemocracy — agents

## Vision

Read [docs/plan/README.md](docs/plan/README.md) and follow its read order — [constitution.md](docs/plan/constitution.md), [north-star.md](docs/plan/north-star.md), [governance-principles.md](docs/plan/governance-principles.md) at minimum — before product or architecture work. [docs/plan/master-plan.md](docs/plan/master-plan.md) is the full working reference.

Code is what exists. The Constitution, governance principles, North Star, and Master Plan are the starting documents. Authority order is in [docs/plan/README.md](docs/plan/README.md); code is last. A later entry in [docs/DECISION-LOG.md](docs/DECISION-LOG.md) wins over those starting documents (D-2026-10-29-02). If a proposed decision conflicts with any of them, warn the Chief Architect before recording it. The Chief Architect decides whether to override. If the override goes ahead, the entry holds the discussion summary and the reasons, and the clause is footnoted "amended by decision #x". Open items: [docs/plan/todo.md](docs/plan/todo.md) (pointer to the project whiteboard).

## Repo layout

One local folder, one GitHub remote — see the `project-setup` subagent in `C:\Users\dmurr\.cursor\agents` ([Dbuns-wut/cursor-agents](https://github.com/Dbuns-wut/cursor-agents)).

## Global subagents

Source of truth: GitHub `Dbuns-wut/cursor-agents` `main`. Desktop `C:\Users\dmurr\.cursor\agents` is that checkout. Do not copy agent files into this product repo.

| Task | Subagent |
|------|----------|
| Should we build this? / protect vision | `founder-advisor` |
| Specs / prioritization | `product-manager` |
| New repo / Windows clone / git layout | `project-setup` |
| App structure / APIs | `architect` |
| Implement an approved spec | `builder` |
| Review before merge | `qa` |
