# Open work — to nail down together

Items Dustin and the agents still need to decide or build. Decisions behind each item are in [../DECISION-LOG.md](../DECISION-LOG.md). Not a sprint board; remove items when they land.

## Product decisions still open

- [x] **Perspectives ↔ Pros vs Cons / Quick Debrief.** Mapped inside the existing Perspectives panel: Quick Debrief → Pros vs Cons → Evidence → Sources. Name stays Perspectives. Confirm in the running app (D-2026-09-16-01, D-2026-09-09-06).
- [x] **Per-org feature toggles.** Org Settings: citizen initiatives off by default; Education Before Vote on by default for community orgs (D-2026-09-09-01, D-2026-09-09-05).
- [x] **Per-org join requirements.** Community org settings: structured text/file fields (union-card preset). Admin reviews on the application (D-2026-09-09-09).

## Engineering — design before touching

- [ ] **Verified identification.** Password sign-in is the account gate (D-2026-10-20-01, D-2026-10-16-01). Uploading and checking a driver's license or passport is not built. The vote key is still created in the browser.
- [x] **On-chain ballot visibility.** `Referendum.ballots[address]` is no longer a public ranking. Blockchain votes default to auditor-visible sealed ballots. The appointed counter can open them. A secret count stores no choice on chain. (D-2026-10-09-01, supersedes D-2026-09-09-07)
- [x] **Education Before Vote for community orgs.** UI gate on community votes, soft default on, admin can disable. No chain. (D-2026-09-09-05)
- [ ] **Post-approval signature re-verification + eligibility monitoring** in `Organization.sol`. Remaining work documented (D-2026-09-16-03). Blocked in part on a real global-verification path. (D-2026-09-09-08)
- [x] **Retire `Voting.sol`.** Removed; nothing referenced it. (D-2026-09-09-10)

## Housekeeping

- [x] Source-available public repo: inspect and contribute for free; production hosting needs a commercial license (D-2026-09-15-01). Supersedes AGPL dual-license.
- [x] Windows tree is GitHub `main`. Old WSL monorepo tagged `archive/wsl-monorepo-2026-07`.
