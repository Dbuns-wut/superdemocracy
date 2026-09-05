# SuperDemocracy — agents

## Vision

Read [docs/plan/README.md](docs/plan/README.md), [docs/plan/north-star.md](docs/plan/north-star.md), and [docs/plan/governance-principles.md](docs/plan/governance-principles.md) before product or architecture work. [docs/plan/master-plan.md](docs/plan/master-plan.md) is the full working reference. More plan documents will be added in `docs/plan/`.

Code is what exists. The plan is the intended direction.

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
