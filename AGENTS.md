# SuperDemocracy — agents

## Vision

Read [docs/plan/README.md](docs/plan/README.md) and follow its read order — [constitution.md](docs/plan/constitution.md), [north-star.md](docs/plan/north-star.md), [governance-principles.md](docs/plan/governance-principles.md) at minimum — before product or architecture work. [docs/plan/master-plan.md](docs/plan/master-plan.md) is the full working reference.

Code is what exists. The North Star and Master Plan are the starting plan. Authority order is in [docs/plan/README.md](docs/plan/README.md); code is last. A later entry in [docs/DECISION-LOG.md](docs/DECISION-LOG.md) wins over the North Star and Master Plan (D-2026-10-29-01). If a proposed decision conflicts with either, warn the Chief Architect before recording it. If they go ahead, the entry holds the discussion summary and the reasons. Open items: [docs/plan/todo.md](docs/plan/todo.md) (pointer to the project whiteboard).

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
