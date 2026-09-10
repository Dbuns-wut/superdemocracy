# SUPERDEMOCRACY DECISION LOG

**Purpose:** One concise record of major governance, architecture, security, and product decisions.  
**Canonical repo location:** `docs/DECISION-LOG.md` (this file). Older research decisions 001014: [plan/research-and-decisions.md](plan/research-and-decisions.md).

GitHub pull requests, review comments, issues, and commits remain the normal history for implementation work. This file records the **why** behind important project decisions so future contributors and AI agents do not accidentally remove features whose purpose they do not understand.

Minor code changes do not belong here.

---

## Entry Format

### YYYY-MM-DD  Decision Name
**Decision:**  
What was decided.

**Why:**  
Why the project chose it.

**Status:** Accepted / Experimental / Tentative / Superseded.

**Source:**  
Founding manuscript, Chief Architect decision, research, implementation experience, or another named source.

---

# ACCEPTED DECISIONS

## 2026-09-08  Constitution Scope
**Decision:** The Superdemocracy Project Constitution governs the Superdemocracy project and platform design. It does not impose a political constitution on organizations that use the platform.

**Why:** Superdemocracy is Government as a Platform. Adopting organizations remain responsible for their own legitimate governance rules and jurisdiction.

**Status:** Accepted.

**Source:** Chief Architect decision.

---

## 2026-09-08  Founder-Led Project Stewardship
**Decision:** While the project is founder-led, the Chief Architect has final authority to approve or reject canonical project changes and public contributions.

**Why:** The role exists only to preserve coherence during development while the public GitHub project remains founder-led.

**Status:** Accepted.

**Source:** Chief Architect decision.

---

## 2026-09-08  Education Before Vote Is a Core Gate
**Decision:** Users are required to open or acknowledge the relevant educational information before casting a vote.

**Why:** Education Before Vote is a founding feature of Superdemocracy and is already implemented in the existing Demos application. The gate places information directly in the path of the decision without pretending to prove that a voter became informed.

**Status:** Accepted. Refined 2026-09-10: still a core gate and on by default; community organizations may disable the UI gate. See D-2026-09-09-05.

**Source:** Founding manuscript + Chief Architect decision + existing implementation.

---

## 2026-09-08  Multiple-Option / IRV Soft Default
**Decision:** When a question genuinely has several viable solutions, Superdemocracy's soft default is to present multiple meaningful options rather than artificially force the issue into Yes/No. Ranked-choice / instant-runoff voting is the preferred default counting method for such decisions.

Binary voting remains appropriate for genuinely binary questions.

**Why:** The founding manuscript argues that many political questions are contests among several possible solutions and that reducing them to a one-versus-one choice can unnecessarily reinforce polarized camps.

**Status:** Accepted.

**Source:** Founding manuscript + Chief Architect decision.

---

## 2026-09-08  Topic-Specific Delegation With Immediate Revocation
**Decision:** When liquid delegation is used, delegation is topic-specific and delegated authority must be withdrawable immediately.

**Why:** Liquid democracy is useful because authority remains fluid. A participant may trust different people on different topics and must be able to take authority back without waiting for an election cycle.

A later delegation change does not rewrite a historical ballot already validly cast.

**Status:** Accepted.

**Source:** Founding manuscript + Chief Architect decision.

---

## 2026-09-08  Expert Qualification Is the Soft Default for Delegation
**Decision:** When liquid delegation is enabled, Expert Qualification is the Superdemocracy soft default for eligibility to receive topic-specific delegations. Organizations may turn the qualification feature off.

**Why:** The founding manuscript identifies a major failure mode in unqualified liquid delegation: viral, famous, charismatic, or popular people can gather political influence without relevant expertise, recreating the demagogue problem.

Qualification may use relevant education or certification, professional experience, accomplishment or success in the field, proven proficiency, or other organization-defined evidence appropriate to the topic.

**Status:** Accepted.

**Source:** Founding manuscript + Chief Architect decision.

---

## 2026-09-08  Governance Measurement Targets the Citizen Experience
**Decision:** Superdemocracy will measure governance experience, not assume that every vote has one predetermined policy objective.

The broad measurement goals are increased satisfaction with organizational decision-making, trust, perceived voice, information quality, legitimate acceptance of results, reduced tribalism/polarization, nuanced discussion, and useful participation.

Raw participation is retained but is not interpreted as success by itself.

**Why:** A vote chooses a direction between competing ideas. Process health and policy implementation outcomes are different things. The platform should learn from lightweight feedback in the same way a product learns from customer experience.

**Status:** Accepted.

**Source:** Founding manuscript + Chief Architect decision.

---

## 2026-09-08  Adaptive Governance Feedback
**Decision:** Feedback questions should be lightweight and may change according to what the project is trying to learn. The same long survey should not be forced after every decision.

**Why:** Different governance methods create different uncertainties. The platform should ask the smallest useful set of questions needed to learn from a particular experiment while avoiding survey fatigue.

**Status:** Accepted.

**Source:** Chief Architect decision.

---

## 2026-09-08  Policy Outcome Measurement Is Case-Specific
**Decision:** When a chosen policy has measurable implementation goals, Superdemocracy may help record them, but the organization or decision defines those goals.

**Why:** The platform does not know the desired direction before the democratic decision has been made and should not invent universal policy-success metrics for organizations.

**Status:** Accepted.

**Source:** Chief Architect decision.

---

## 2026-09-08  Proactive Emergency Protocols
**Decision:** Superdemocracy provides organizations with the ability to create proactive emergency protocols before a crisis occurs and encourages preparation for foreseeable emergencies.

The value is that deliberation and decision-making occur before the crisis, allowing an already-decided response to be executed rapidly when needed.

If no applicable Superdemocracy protocol exists, the platform falls back to the organization's legitimate pre-existing governance and emergency processes.

**Why:** Emergency speed should come from prior deliberation rather than improvised powers created in the pressure of the event.

**Status:** Accepted.

**Source:** Founding manuscript + Chief Architect decision.

---

## 2026-09-08  AI May Assist; Organizations Decide Whether It May Receive Political Authority
**Decision:** AI may assist with information gathering, Education Before Vote, source organization, summarization, deliberation, administration, analysis, accessibility, and other useful platform functions.

Organizations decide for themselves whether AI may ever receive delegated political authority.

If an organization permits AI to receive political authority, AI cannot create, enlarge, or perpetuate its own authority, and lawful democratic mechanisms must remain able to withdraw it.

**Why:** Superdemocracy provides governance capabilities rather than prescribing whether an organization should delegate votes or governing authority to AI.

**Status:** Accepted.

**Source:** Founding manuscript + Chief Architect decision.
---

## 2026-09-08  Election-Critical Verification Does Not Require Every Component To Be Open Source
**Decision:** Components and protocols whose transparency is necessary to verify election integrity or cryptographic claims must be sufficiently inspectable for independent verification. The Constitution does not require every commercial component of the platform to be open source.

**Why:** Public verification of election-critical claims is non-negotiable; unrelated commercial implementation does not automatically require publication.

**Status:** Accepted.

**Source:** Chief Architect decision.

---

## 2026-09-08  No Automatic Chief Architect Succession
**Decision:** The Chief Architect may name a successor later but no person automatically inherits the role.

If the Chief Architect becomes permanently unavailable without naming a successor, the public work remains available under its applicable licenses and may be studied, preserved, forked, adapted, or continued by others.

**Why:** There is currently no collaborator or institution that should be granted fictional authority simply to fill a succession chart.

**Status:** Accepted.

**Source:** Chief Architect decision.

---

## 2026-09-08  Canonical Document Hierarchy
**Decision:** When project documents conflict, use this order:

1. Superdemocracy Project Constitution
2. Governance Principles
3. Master Plan and current System Specification
4. Founding Superdemocracy Manuscript
5. Decision Log
6. Current implementation and technical documentation
7. Historical prompts, chats, drafts, and superseded documents

**Why:** The founding manuscript was written during the project's deepest original governance research and remains the intellectual foundation. Later explicit decisions may refine it, but implementation notes should not casually bury it.

**Status:** Accepted.

**Source:** Chief Architect decision.
---

# TENTATIVE / BOOKMARKED IDEAS

## 2026-09-08  Soft-Default Warning Modal
**Decision:** Bookmark a possible UI feature: when an organization changes a configurable governance setting away from the Superdemocracy soft default, show a warning explaining why the default exists, the main tradeoff or danger of changing it, and links to supporting research where available.

Example use: disabling Expert Qualification could warn that popular or charismatic non-experts may accumulate delegated influence.

**Why:** Configuration should remain possible, but organizations should understand why evidence-backed defaults exist before moving away from them.

**Status:** Tentative / UI bookmark. Not a constitutional requirement.

**Source:** Chief Architect idea.

---

# DECISIONS RECORDED 2026-09-09

Recorded after auditing the repository against the 2026-09-08 handoff package. IDs (`D-2026-09-09-xx`) are referenced from the plan documents and [plan/todo.md](plan/todo.md). Older research decisions 001014 remain in [plan/research-and-decisions.md](plan/research-and-decisions.md).

---

## 2026-09-09  Per-Organization Feature Toggles (D-2026-09-09-01)
**Decision:** Citizen-initiative flows (petition ? approval ? launch) are an **organization setting**, not a platform constant. Each organization gets a settings dashboard with feature toggles  initiatives on/off, Education Before Vote on/off for community orgs, and future features  each with its own default.

**Why:** The flow exists in `Organization.sol`, but most real organizations do not allow member-initiated proposals today. Forcing it on would misrepresent how they govern.

**Status:** Accepted. Documented only; not being built now so the current work is not sidetracked.

**Source:** Chief Architect decision.

---

## 2026-09-09  In-Repo Document Authority Follows the Constitution (D-2026-09-09-02)
**Decision:** The in-repo authority order ([plan/README.md](plan/README.md)) is the Constitution's order (Article XI). The previous in-repo ordering that ranked "current code" first is superseded. Code describes what *exists*; it does not *outrank* the vision documents. Code/doc conflicts are logged here and decided, never resolved by assuming the code is right.

**Why:** The handoff package is the current canonical set and outranks the older plan documents.

**Status:** Accepted.

**Source:** Chief Architect decision + Constitution Article XI.

---

## 2026-09-09  Local Anvil Is Chain 31338 on Port 8546 (D-2026-09-09-03)
**Decision:** The project's local Anvil runs at `http://127.0.0.1:8546`, chain id `31338`. The handoff copies of the Master Plan and Specification said `31337` / `8545` (Anvil defaults) and were corrected on import.

**Why:** `lib/web3.ts`, `lib/web3-server.ts`, and `deploy.sh` all use `31338` / `8546`, and the Chief Architect confirmed those values. Always verify the running node (`cast chain-id --rpc-url http://127.0.0.1:8546`) before debugging the frontend.

**Status:** Accepted.

**Source:** Chief Architect decision + implementation.

---

## 2026-09-09  Deploy With `deploy.sh` and `cast send`, Never `forge create` (D-2026-09-09-04)
**Decision:** `contracts/deploy.sh` is the deployment path and is committed. It restarts Anvil, deploys `IdentityMock` ? `ReferendumFactory` ? `GroupRegistry` with `cast send --create`, pre-verifies the five default Anvil accounts on `IdentityMock` (local dev only), and writes the `NEXT_PUBLIC_*` addresses into `.env.local`.

**Why:** The script was left in the WSL checkout when the repo moved to one Windows clone. `forge create` repeatedly failed against this setup. The key in the script is Anvil's public default account 0  test material, not a secret.

**Status:** Accepted.

**Source:** Implementation experience + Chief Architect decision.

---

## 2026-09-09  Education Before Vote for Community Orgs Is a Toggleable UI Gate (D-2026-09-09-05)
**Decision:**
- **Governance organizations (on-chain referendums):** the gate stays contract-enforced (`Referendum.acknowledgeEducation()` before `vote()`).
- **Community organizations (off-chain):** the gate is a **UI gate only**  no contract, no chain. It is **on by default** ("soft default") and an org admin may turn it off in the org's settings.

**Why:** Community orgs are low-stakes and off-chain; requiring a chain-enforced gate there is disproportionate. The gate still exists everywhere by default.

**Explicit departure (Constitution Article X 2):** Education Before Vote remains a core gate and is on by default. It is optional **for community orgs only**. Canonical wording was amended 2026-09-10 after Chief Architect approval.

**Status:** Accepted. Canonical documents amended. Community-org UI gate not yet implemented  see [plan/todo.md](plan/todo.md).

**Source:** Chief Architect decision.

---

## 2026-09-09  "Perspectives" Is the Member-Facing Name for the Information Layer (D-2026-09-09-06)
**Decision:** The existing **Perspectives** tab on referendums is the home of the Pros vs Cons layer described in the canonical documents. It is not a competing feature. The three-level information architecture (Quick Debrief / Pros vs Cons / evidence and sources) will be mapped onto it without losing the neutral name.

**Why:** "Perspectives" was chosen deliberately as a neutral label instead of "Get educated" or similar.

**Status:** Accepted in principle; exact mapping open. Dustin wants to look at the running app first.

**Source:** Chief Architect decision + existing implementation.

---

## 2026-09-09  On-Chain Vote Secrecy Defect Will Be Fixed by Design, Not Patched (D-2026-09-09-07)
**Decision:** `Referendum.ballots[address]` is a public voter ? ranking map and violates Constitution Article VI 2 (secret ballot by default). It will be fixed, but only after a design that changes `vote()`, tallying, the ABI, and the referendum UI together. Community-org ballots are already encrypted (`lib/ballot-crypto`) and are closer to the rule.

**Why:** A quick storage change would likely break voting entirely.

**Status:** Accepted; work item open.

**Source:** Chief Architect decision + audit.

---

## 2026-09-09  Post-Approval Re-Verification Caveat and Eligibility Monitoring (D-2026-09-09-08)
**Decision:**
- Signatures collected before approval must be re-verified after approval  **unless** the signer is **globally verified** (uploaded government ID and passed verification).
- No real government-ID verification path exists today, so the caveat is **benched**: until then, all signers are re-verified.
- Petition signatures are **actively monitored**. A signer who becomes ineligible to vote in that jurisdiction (death, moving out of the jurisdiction, loss of membership) has their signature removed and counts recomputed.

**Why:** Re-verifying an already globally verified person is redundant; monitoring keeps petition counts honest over time.

**Status:** Accepted. Neither exists in `Organization.sol` yet (`signPetition` increments `verifiedCount` once).

**Source:** Chief Architect decision.

---

## 2026-09-09  Global Verification and Per-Organization Verification Are Different Things (D-2026-09-09-09)
**Decision:**
- **Global verification**  the person is a verified individual (government ID or equivalent). Required for government and other high-stakes organizations that use the chain. Not implemented for real yet; `IdentityMock` stands in for it locally.
- **Per-organization verification**  the person meets *that organization's* join requirements, granted by that org's admin. It does **not** make the person globally verified.
- **Community orgs have no verified-join gate.** Anyone can apply; the admin decides.
- Each organization defines its own join requirements. Reference example: a union requires a member card number checked against the union's database, or the applicant enters the number and uploads a photo of the card and an admin approves manually when reviewing the application.

**Why:** Early on, members could not be added to a group before being globally verified. The org-admin-can-verify workaround is why `IdentityMock` and the admin flows look the way they do. Keeping the two concepts distinct prevents a per-org approval from leaking into global identity.

**Status:** Accepted. `IdentityMock.setVerified` being unrestricted is acceptable **only** as a local mock; production identity is a separate component.

**Source:** Chief Architect decision + implementation history.

---

## 2026-09-09  `Voting.sol` Is Legacy (D-2026-09-09-10)
**Decision:** `contracts/src/Voting.sol` (the original toy poll: public counts, no identity, no education, no ranked ballots) is kept so nothing breaks but is not the direction and must not be extended. The handoff documents define what is being built instead. Removal can be scheduled once nothing references it.

**Status:** Accepted.

**Source:** Chief Architect decision.

---

## 2026-09-09  Referendum Constructor Includes `organization` (D-2026-09-09-11)
**Decision:** The constructor is `(title, description, options, startTime, endTime, identityVerifier, organization)`. `organization` binds a referendum to the org that launched it via `ReferendumFactory`. The specification was updated to match the code.

**Why:** The spec listed six arguments; the implementation has seven and is correct.

**Status:** Accepted.

**Source:** Implementation + Chief Architect decision.

---

## 2026-09-09  Existing Scope Beyond the Handoff Goal Stays (D-2026-09-09-12)
**Decision:** The tree contains community orgs, member messaging, invites, encrypted community votes, and more  a larger surface than the handoff's "stabilize live petition data" goal. Anything already built stays; it is there for a reason. Features are not removed to match a narrower document. If something built conflicts with a principle, log it here and raise it.

**Status:** Accepted.

**Source:** Chief Architect decision.

---

## 2026-09-10  Canonical Wording: Community-Org Education Gate Exception (D-2026-09-10-01)
**Decision:** The Chief Architect approved amending the Constitution (Article II Section 3), North Star, Governance Principles (v0.3), and Master Plan so Education Before Vote is a core gate on by default everywhere, with one exception: community organizations may turn the UI gate off in their settings. Governance organizations cannot; on-chain referendums keep contract enforcement.

**Why:** Article X Section 2 requires an explicit record when Superdemocracy departs from "not an optional organization setting." The 2026-09-09 decision (D-2026-09-09-05) is now in the canonical documents, not only in this log.

**Status:** Accepted.

**Source:** Chief Architect approval, 2026-09-10.

---

# HOW TO ADD FUTURE ENTRIES

Add an entry when a future contributor would reasonably ask:

> "Why does Superdemocracy work this way?"

If the answer is important to the philosophy, security, architecture, or governance model, record it here.

If the answer is merely "because this React component was easier to write this way," Git history is enough.
