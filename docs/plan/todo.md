# Open work — to nail down together

Items Dustin and the agents still need to decide or build. Decisions behind each item are in [../DECISION-LOG.md](../DECISION-LOG.md). Not a sprint board; remove items when they land.

## Docs

- [ ] **Re-supply the 2026-09-08 handoff zip** (`SUPERDEMOCRACY-CURSOR-HANDOFF-FINAL.zip`). It is no longer on disk. When it is back: commit `constitution.md`, `governance-measurement.md`, the v0.2 `governance-principles.md`, updated master plan / spec / security docs, and merge its decision log into `docs/DECISION-LOG.md`. Fix Anvil values to `31338` / `8546` in the copies (D-2026-09-09-03).

## Product decisions still open

- [ ] **Perspectives ↔ Pros vs Cons / Quick Debrief.** Map the existing Perspectives tab onto the three information levels without losing the neutral name. Dustin wants to look at the running app first (`npm run dev` → a referendum page) before deciding. (D-2026-09-09-06)
- [ ] **Per-org feature toggles.** Which features are toggleable, their defaults, and where the settings dashboard lives. Start list: citizen initiatives (petition → approval → launch), Education Before Vote for community orgs. (D-2026-09-09-01)
- [ ] **Per-org join requirements.** Shape of "this org requires X to join" (free text, structured fields, file upload for admin review). Union member card is the reference example. (D-2026-09-09-09)

## Engineering — design before touching

- [ ] **On-chain vote secrecy.** `Referendum.ballots[address]` is public. Design a storage/tally approach that keeps raw ballots but breaks the identity → ballot link, then change `vote()`, tally, ABI, and the referendum UI together. Do not patch quickly. (D-2026-09-09-07)
- [ ] **Education Before Vote for community orgs.** UI gate, soft default on, admin can disable. No chain involvement. (D-2026-09-09-05)
- [ ] **Post-approval signature re-verification + eligibility monitoring** in `Organization.sol`. Blocked in part on a real global-verification path. (D-2026-09-09-08)
- [ ] **Retire `Voting.sol`** once confirmed unreferenced. (D-2026-09-09-10)

## Housekeeping

- [ ] Choose a `LICENSE` before the GitHub repo goes public.
- [ ] Reconcile `cursor/2026-09-05` with `origin/main` (histories diverged when the Windows clone was created). Needs an explicit call from Dustin on how.
