# SuperDemocracy — agents

## Vision

Read [docs/plan/README.md](docs/plan/README.md) and [docs/plan/constitution.md](docs/plan/constitution.md) before product or architecture work. The system specification, security architecture, and governance measurement doc are the technical codes beside the rulebook.

Code is what exists. The Constitution is the rulebook. Authority order is in [docs/plan/README.md](docs/plan/README.md); code is last. A later entry in [docs/DECISION-LOG.md](docs/DECISION-LOG.md) wins over the Constitution and the technical codes after a warning (D-2026-10-29-03). If a proposed decision conflicts with one of them, warn the Chief Architect before recording it. The Chief Architect decides whether to override. If the override goes ahead, the entry holds the discussion summary and the reasons, and the clause is footnoted "amended by decision #x". Open items: [docs/plan/todo.md](docs/plan/todo.md) (pointer to the project whiteboard).

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
