# Decision log

Product and architecture decisions that are not obvious from the code. Newest at the bottom. Add an entry when a document and the code disagree, or when the Chief Architect (Dustin Murray) settles a question — do not silently pick a side.

Older research decisions (001–014, from the founding book) live in [plan/research-and-decisions.md](plan/research-and-decisions.md).

> **Pending merge:** the canonical `08-DECISION-LOG.md` from the 2026-09-08 handoff package has not been committed yet — the zip was not on disk when this file was created. When it is re-supplied, its entries go **above** this line and the entries below keep their IDs.

---

## D-2026-09-09-01 — Per-organization feature toggles (settings dashboard)

**Context.** Petition → Approval → Launch (citizen initiative) is a real flow in `Organization.sol`, but most real-world organizations do not allow member-initiated proposals today.

**Decision.** Citizen-initiative flows are an **organization setting**, not a platform constant. Each organization gets a settings dashboard with feature toggles (petitions/initiatives on or off, Education Before Vote on or off for community orgs, and future features). Defaults are chosen per feature.

**Status.** Documented only. Not building it now — it would sidetrack the current work. See [plan/todo.md](plan/todo.md).

## D-2026-09-09-02 — Document authority: the 2026-09-08 handoff order wins

**Decision.** The authority order in the handoff Constitution replaces the older in-repo order that ranked "current code" first:

1. Constitution
2. Governance Principles
3. Master Plan / System Specification
4. Founding manuscript
5. Decision Log
6. Implementation (code)

Code still describes what *exists*; it no longer *outranks* the vision documents. When code and documents disagree, log it here and decide — do not treat the code as automatically correct.

## D-2026-09-09-03 — Local Anvil: chain id 31338, RPC 127.0.0.1:8546

**Context.** The handoff Master Plan / Spec list Anvil at `31337` / `8545` (Anvil defaults). The code (`lib/web3.ts`, `lib/web3-server.ts`) and the original `deploy.sh` use **`31338` / `8546`**.

**Decision.** `31338` / `8546` is correct for this project. The in-repo docs keep those values; the handoff copies should be corrected when merged. Always verify the running node (`cast chain-id --rpc-url http://127.0.0.1:8546`) before debugging the frontend.

## D-2026-09-09-04 — Deploy tooling: `deploy.sh` + `cast send`, never `forge create`

**Context.** The deploy script was left behind in the WSL checkout when the repo moved to a single Windows clone.

**Decision.** `contracts/deploy.sh` is back in the tree. It starts Anvil, deploys `IdentityMock` → `ReferendumFactory` → `GroupRegistry` with `cast send --create`, pre-verifies the five default Anvil accounts on `IdentityMock` (local dev only), and writes the two `NEXT_PUBLIC_*` addresses into `.env.local`. `forge create` repeatedly fought us and is not used. The script uses the well-known Anvil account 0 key, which is public test material, not a secret.

## D-2026-09-09-05 — Education Before Vote: UI gate for community orgs, soft default ON, toggleable

**Context.** The canonical documents describe Education Before Vote as a core platform gate. In the code it is enforced **on-chain only** (`Referendum.acknowledgeEducation()`); community-org votes have no education step.

**Decision.**
- **On-chain referendums (governance orgs):** keep the contract-enforced acknowledgement as it is.
- **Community orgs:** Education Before Vote is a **UI gate only** — no contract, no chain. It is **on by default** and an org admin can turn it off in the org's settings (see D-2026-09-09-01).
- This is a refinement of "education is a core gate": the gate exists everywhere by default; community orgs may opt out because they are low-stakes and off-chain.

**Status.** Documented. Implementation is on the [to-do list](plan/todo.md).

## D-2026-09-09-06 — "Perspectives" is the member-facing name for the information layer

**Context.** The existing referendum UI has a **Perspectives** tab. The word was chosen deliberately as a neutral label instead of "Get educated" or similar. The canonical documents describe the information architecture as Quick Debrief / Pros vs Cons / evidence and sources.

**Decision.** Perspectives is not a competing feature; it is the existing home for the Pros-vs-Cons layer. It must be reconciled into the three-level structure without losing the neutral naming. Exact mapping is open — Dustin wants to look at the running app first (see to-do).

## D-2026-09-09-07 — On-chain vote secrecy must be fixed, carefully

**Context.** `Referendum.ballots[address]` is a public voter → ranking map. That violates "identity must not map to ballot". Community-org ballots are already encrypted (`lib/ballot-crypto`) and are closer to the rule.

**Decision.** This is a real defect and goes on the to-do list. It will **not** be patched quickly — changing ballot storage touches `vote()`, tallying, and the referendum UI, and a rushed fix could break voting entirely. Design first, then change.

## D-2026-09-09-08 — Post-approval signature re-verification and ongoing eligibility monitoring

**Rule (from the canonical docs).** Petition signatures collected before approval must be re-verified after approval.

**Caveat (Chief Architect).** Re-verification is **not** required for a signer who is **globally verified** (has uploaded government ID and passed verification). We do not have a real government-ID verification path today, so this caveat is **benched** until one exists; until then, treat all signers as needing re-verification.

**Addition.** Petition signatures are **actively monitored**. If a signer becomes ineligible to vote in that jurisdiction (death, moving out of the jurisdiction, loss of membership), their signature is removed and counts are recomputed.

**Status.** Neither the re-verification pass nor eligibility monitoring exists in `Organization.sol` yet (`signPetition` increments `verifiedCount` once). Documented; implementation is future work.

## D-2026-09-09-09 — Two kinds of verification: global and per-organization

**Context.** Early on, members could not be added to a group before they were globally "verified". The workaround — an org admin can verify a member **for that org** — is why `IdentityMock` and the org admin flows look the way they do.

**Decision.** There are two distinct things and the product must keep them distinct:

- **Global verification** — the person is a verified individual (government ID or equivalent). Required for government and other high-stakes orgs that use the chain. Not implemented for real yet; `IdentityMock` stands in for it locally.
- **Per-organization verification** — the person meets *that organization's* join requirements. Granted by that org's admin. Does **not** make the person globally verified.

Examples of per-org requirements: a union requires a member card number checked against the union's database, or the applicant enters the number and uploads a photo of the card and an admin approves manually when reviewing the application. Each organization defines its own join requirements.

**Community orgs** have **no** verified-join gate. Anyone can apply; the admin decides.

`IdentityMock.setVerified` being unrestricted is acceptable **only** as a local mock. A production identity contract is a separate component (identity stays separate from governance).

## D-2026-09-09-10 — `Voting.sol` is legacy

**Decision.** `contracts/src/Voting.sol` is the original toy poll (public vote counts, no identity, no education, no ranked ballots). The handoff documents define what we are building instead. It is kept for now so nothing breaks; it is not the direction and should not be extended. Removal can be scheduled once nothing references it.

## D-2026-09-09-11 — Referendum constructor includes `organization`

**Decision.** The implemented constructor is
`(title, description, options, startTime, endTime, identityVerifier, organization)`.
The `organization` argument binds a referendum to the org that launched it (via `ReferendumFactory`). The specification is updated to match; the code was right and stays.

## D-2026-09-09-12 — Existing scope beyond the handoff stays

**Decision.** The tree contains community orgs, member messaging, invites, encrypted community votes and more — a larger surface than the handoff's "stabilize live petition data" goal. Anything already built stays; it is there for a reason. Do not remove features to match a narrower document. If something built conflicts with a principle, log it here and raise it rather than deleting it.
