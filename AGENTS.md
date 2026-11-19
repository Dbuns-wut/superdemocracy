# SuperDemocracy — agents

## Vision

Read [docs/plan/README.md](docs/plan/README.md) before product or architecture work, then only the constitution article, decision-log entry, and technical-code section the change touches. The system specification, security architecture, and governance measurement doc are the technical codes beside the rulebook. Do not load the founding books unless those do not settle the question.

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

## Model and token use (this repo)

Chief Architect, 2026-11-19. Quality of the build outranks speed. This section overrides the model pins in `Dbuns-wut/cursor-agents` for SuperDemocracy only. Other products keep those pins. The operational rule agents always see is [.cursor/rules/agent-workflow.mdc](.cursor/rules/agent-workflow.mdc).

Frontier Opus here means Claude Opus 5.5 High (`claude-opus-5-5-high`). It scores above Fable 5.1 on CursorBench at about two-fifths of Fable 5.1's token price. The chat picker defaults to Medium; select High. Fast is the same model at double price, so leave it off.

| Work | Model | When |
|------|--------|------|
| Implementation | Opus 5.5 High | Every product build. If this chat is already that model, implement here. Otherwise Task `builder` with `model` set to `claude-opus-5-5-high`. |
| Review | Opus 5.5 High | Once, after build, lint, and tests. Task `qa` with the same slug. |
| Architecture | Opus 5.5 High | Only when the change crosses a module boundary or the spec is silent on structure. |
| Security review | Opus 5.5 High | Only when the slice touches auth, secrets, or row access. The security gate still runs inside the build. |
| Same failure, second try | Opus 5.5 xhigh | After High has already failed that question. `max` only if Dustin asks. |
| Search, logs, commands | Parent tools | Do not open a frontier subagent to look something up. |
| Repo layout, deploy | Global Grok pin | `project-setup`, `senior-devops-engineer`. |

A clear task does not run founder-advisor, product-manager, or ui-ux-designer first. Those seats were spending Fable before Composer wrote any code, which is why a build ran out of tokens unfinished. Resume the same builder for a follow-up so the cached prefix is reused. Pass paths and the acceptance check, not the constitution or the thread. One Opus implementation at a time.

Checks do not shrink: build, lint, the tests that cover the change, a browser pass for visible UI, and the security gate.
