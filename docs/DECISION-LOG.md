# SUPERDEMOCRACY DECISION LOG

**Purpose:** One concise record of major governance, architecture, security, and product decisions.
**Canonical repo location:** `docs/DECISION-LOG.md` (this file). Older research decisions 001-014: [plan/research-and-decisions.md](plan/research-and-decisions.md). Research Decision 009 has been removed.

GitHub pull requests, review comments, issues, and commits remain the normal history for implementation work. This file records the **why** behind important project decisions so future contributors and AI agents do not accidentally remove features whose purpose they do not understand.

Minor code changes do not belong here.

---

## Entry Format

### N. Decision Name (D-YYYY-MM-DD-NN)
**Date:** YYYY-MM-DD

**Decision:**
What was decided.

**Why:**
Why the project chose it.

**Status:** Accepted / Experimental / Tentative / Superseded.

**Source:**
Founding manuscript, Chief Architect decision, research, implementation experience, or another named source.

The newest entry is at the top. Each entry keeps a permanent number. The next entry gets the next number and is inserted above the current top. Do not renumber older entries.

When a later entry replaces an older one, leave the old entry in place and put this footnote directly under its heading:

> Superseded by N. Decision Name (D-YYYY-MM-DD-NN).

IDs such as `D-2026-09-09-01` are stable references used by the plan documents. A display number and a D-id can both appear in the heading. An entry is dated the day it is committed. If an entry is edited after that, put a footnote directly under its heading saying what changed and when.

---

# DECISIONS

## 43. Non-Blockchain Platform and Solo-Maintainable Organization Voting (D-2026-10-30-01)
**Date:** 2026-10-30

**Decision:**
- Superdemocracy no longer requires a blockchain. Accounts and governance actions must not require wallets, wallet extensions, cryptocurrency, seed phrases, gas, or a running chain. Governance rules are enforced by the server, not by smart contracts.
- The blockchain build is preserved as the remote branch `archive/blockchain-relic` (commit `a7fa699`). The replacement is developed on a separate branch; once verified, the non-blockchain version becomes `main`. The legacy chain is not redeployed or modified to archive it. In the new version, blockchain references are removed everywhere except this log.
- Governance votes and petition signatures stay linked to the participant's verified identity. A participant can review their own submissions. Only authorized auditors and appointed vote counters can inspect other participants' records. Ordinary members and the public cannot. This is a founder decision; the system is not redesigned as an unlinkable ballot.
- Superdemocracy is a platform for hosting votes. The founder's recommendations are the default settings. An organization may change a setting, but when a setting affects security, integrity, how voters see information, or anything else that can affect the vote, changing it shows a warning modal: what will be affected, the pros and cons, and a confirmation. Entry 31's record toggle is one of those settings. Entry 15's modal is accepted.
- Mobile banking is the model for account security, ease of use, confirmation of each action, recordkeeping, and investigation. This is a design goal, not a claim that the application meets banking standards today.
- Verification happens at critical submission points: petition submission and after voting closes, before final acceptance or certification. Suspected tampering is investigated. Confirmed compromised submissions can be invalidated; affected participants are notified and may resubmit. The original record and its resolution are preserved; nothing is silently overwritten. Dispute deadlines and procedures are decided when needed.
- The wedge launch is organization voting that one builder can maintain: create organization → manage eligible members → create vote → cast vote → review own submission → authorized counting and review → finalize result. Community and Governance organizations remain distinct. Existing working capabilities are kept, and functionality and UX stay the same where necessary and possible; nothing is removed to fit the wedge.
- Underlying requirements survive the deferral: Education Before Vote (on by default, server-enforced for Governance organizations), ranked-choice support, immediately revocable topic delegation when delegation ships, petitions and liquid delegation later.
- The account's blockchain address stops being a product concept. The per-account key from entry 42 may remain as an internal signing credential for record integrity; it is never shown as an address or wallet.

**Why:** Blockchain was an implementation assumption, not a founding goal (Constitution Art. XII §3). The project's goals are trustworthy, usable governance and traceable confidential records. A server-enforced system with established auth and database practice reaches those with far less burden on a solo builder. Discussion summary: the Chief Architect weighed the wallet and gas requirement against the mobile-banking usability bar, confirmed that identity-linked confidential records (entry 31) are the founder position rather than a blockchain artifact, and chose a small organization-voting wedge over continuing the full on-chain platform.

**Assumptions:** Established hosted auth and a relational database are enough for the wedge. Independent verification can be added later through audit logs, signed records, and external review rather than a public chain.

**Revisit if:** an adopting organization legally requires on-chain or third-party-anchored records, or the server-trust model is shown insufficient for a high-stakes deployment.

**Status:** Accepted direction; implementation pending.

**Source:** Chief Architect, decided 2026-10-29, recorded 2026-10-30. Extends 31 (D-2026-10-09-01) beyond blockchain. Accepts the modal in 15. Amends 42 (D-2026-10-25-01) on the address. Constitution Art. II §3, VI §2, XIII §1 and the technical codes are amended to match.

---

## 42. One account, one address (D-2026-10-25-01)
**Date:** 2026-10-25

> Amended by 43. Non-Blockchain Platform and Solo-Maintainable Organization Voting (D-2026-10-30-01). The address is no longer a product concept. The per-account key may remain as an internal signing credential.

**Decision:** Each account has one address. That address is created with the account and comes back when the person signs in on any device. Votes and other account actions use that address only. A browser wallet cannot stand in as a second address while the person is in the account. The private key is stored as ciphertext encrypted with the password. The password itself stays a scrypt hash. Changing the password re-encrypts the same key. This is not a government ID check. Two different emails are still two accounts.

**Why:** The Chief Architect said people must be able to vote from any device on their account, and the wallet must be tied to that account. Before accounts, changing a MetaMask address was how different voters were tried. That must not work inside an account: one account cannot act as a different address, and one account cannot hold more than one address.

**Status:** Accepted. The key is encrypted at rest. Sign-in is what opens it on a device. The server sees the password during sign-in, the same as any password login, and does not store the raw key. A session by itself does not return the key.

**Source:** Chief Architect, 2026-10-25.

---

## 41. One Rulebook, and the Extra Plans Are Removed (D-2026-10-29-03)
**Date:** 2026-10-29

**Decision:** The North Star, the governance principles, and the Master Plan are folded into the Constitution, and those three files are deleted. The Constitution is the rulebook. The system specification, the security architecture, and the governance measurement document stay as separate technical codes. Contract guardrails that lived only in the Master Plan now live in the system specification. The decision log, the research file, the books, the product language guide, the data note, and the whiteboard pointer stay as they are.

**Why:** Decision 40 left the merge for a later pass and said those documents would not be deleted yet. On 2026-10-29 the Chief Architect confirmed the set and said not to leave the old plans as pointer files. They are clutter. The discussion was the list of what each planning document was for, then the proposal of one numbered rulebook plus three technical codes, then the instruction to fold the plans in and remove them.

**Status:** Accepted. Completes the merge that decision 40 deferred. Article XI is footnoted "amended by decision #41".

**Source:** Chief Architect, 2026-10-29.

---

## 40. Constitution and Principles Use the Same Override Rule (D-2026-10-29-02)
**Date:** 2026-10-29

> The merge and deletion this entry deferred are done by 41. One Rulebook, and the Extra Plans Are Removed (D-2026-10-29-03).

**Decision:** The Constitution and the governance principles are treated the same as the North Star and the Master Plan. They are starting documents. They can become outdated. A later decision log entry wins over any of them. Before recording a decision that conflicts with one of them, warn the Chief Architect. The Chief Architect then decides whether to override it. If the override goes ahead, that decision log entry holds the discussion summary and the reasons. When the starting documents are numbered as a codebook, the overridden clause gets a footnote: "amended by decision #x".

**Why:** Decision 39 left the Constitution and the governance principles above the decision log. On 2026-10-29 the Chief Architect said they are the same kind of starting plan as the North Star and the Master Plan. There are also too many overlapping planning documents. Their purposes are listed for a later pass that keeps one codebook and numbers its clauses. This entry does not merge or delete those documents.

**Status:** Accepted. Extends decision 39. The Pros vs Cons placement in decision 38 remains.

**Source:** Chief Architect, 2026-10-29.

---

## 39. A Logged Decision Can Override the Starting Plan (D-2026-10-29-01)
**Date:** 2026-10-29

> Extended by 40. Constitution and Principles Use the Same Override Rule (D-2026-10-29-02). The Constitution and the governance principles are in the same class as the North Star and the Master Plan.

**Decision:** The North Star and the Master Plan are the starting plan. They can become outdated. A later decision log entry wins over them. Before recording a decision that conflicts with either, warn the Chief Architect so there is time to think again. If the Chief Architect goes ahead, that entry holds the discussion summary and the reasons for overriding them.

**Why:** Entry 38 was drafted to say the North Star and Master Plan win over the decision log. On 2026-10-29 the Chief Architect said that sentence was wrong. Those two documents are the original plan, not a veto. The discussion was: look at decisions 32 and 38, because the "they win" line might be a mistake; then the correction above.

**Status:** Accepted. Corrects the authority sentence in entry 38. The Pros vs Cons placement in entry 38 remains. Updates Article XI and decisions 14 and 17 on this point.

**Source:** Chief Architect, 2026-10-29.

---

## 38. Pros vs Cons Sits Inside the Quick Debrief (D-2026-10-28-01)
**Date:** 2026-10-28

> The authority sentence in the first draft of this entry is corrected by 39. A Logged Decision Can Override the Starting Plan (D-2026-10-29-01). The placement remains.

**Decision:** Pros vs Cons sits inside the Quick Debrief. Decision 32's separate Pros vs Cons step is superseded. The member-facing name stays Perspectives.

**Why:** The Chief Architect chose this placement on 2026-10-28. It matches the starting plan. The first draft also said the North Star and Master Plan win over the decision log. That rule was a mistake. Entry 39 is the rule.

**Status:** Accepted for the placement.

**Source:** Chief Architect, 2026-10-28.

---

## 37. Signup requires a password (D-2026-10-20-01)
**Date:** 2026-10-20

**Decision:** Creating an account asks for a password and does not open the app until that password is stored. The password is kept only as a scrypt hash. Sign-in checks that hash. A person can change it from Settings with their current password. This is the account people will later use when identification is checked. Uploading a driver's license or passport is not built, and this decision does not pretend that check exists.

**Why:** Signup was letting a person in with only a name and email. The Chief Architect said an account has to be secure enough that a verified identity document could be trusted there later.

**Status:** Accepted. Password gate is in place. Identity-document upload and verification are not.

**Source:** Chief Architect, 2026-10-20.

---

## 36. The account follows the person (D-2026-10-16-01)

> The address now follows the account. See 42. One account, one address (D-2026-10-25-01). A government ID check is still not built.

**Date:** 2026-10-16

**Decision:** A SuperDemocracy account belongs to the person, not to a device. The same account must work on different devices. What that person can do depends on the identification they have provided and had verified. No wallet install and no second signup (D-2026-09-25-01). This is not a claim that a government ID check exists yet.

**Why:** The Chief Architect corrected the launch note. Saying the account is tied to one device described the current browser key, not the product. Capability is gated by verified identification, which can increase over time.

**Status:** Accepted direction. Password sign-in is the account gate (D-2026-10-20-01). The account's one address follows that sign-in (D-2026-10-25-01). A government ID check is still not built.

**Source:** Chief Architect, 2026-10-16.

---

## 35. In-app account, no browser extension (D-2026-09-25-01)

> The device-local key, and using a browser wallet as the account's address, are superseded by 42. One account, one address (D-2026-10-25-01).

**Date:** 2026-09-25

**Decision:** Members sign in inside SuperDemocracy. The default account is created and kept on the device. A browser extension such as MetaMask is not required. An injected browser wallet may remain available for people who already use one, especially for on-chain organizations. This is not government-ID verification and it does not replace vote secrecy.

**Why:** The Chief Architect does not want members, especially older people, to install a wallet extension. Sign-in should feel like part of the product: do it once on this device, then it is already there.

**Status:** Accepted for sign-in inside the product, with no wallet extension. The account has one address, and that address follows the sign-in (D-2026-10-25-01). A browser wallet is not a second address for the account.

**Source:** Chief Architect decision, 2026-09-25.

---

## 34. Post-Approval Re-Check Remaining Work (D-2026-09-16-03)
**Date:** 2026-09-16

**Decision:** Document remaining `Organization.sol` work. Do not fake government ID.

**Remaining:**

1. **After `approvePetition`:** re-check every signer unless globally verified. No real global-verification path exists, so today that means **every** signer (D-2026-09-09-08 caveat is benched). Drop signers who are no longer members or no longer verified; decrement `verifiedCount`; clear `hasSigned` for those addresses.
2. **Eligibility monitoring:** when a signer dies, leaves the jurisdiction, or loses membership, remove the signature and recompute counts. Needs hooks on member removal / verification loss, and later a real identity provider for death/move. Not a cron invention in this slice.
3. **Do not** treat per-org join approval (union card, etc.) as global verification.
4. **Do not** ship a pretend government-ID uploader.

Current code: `signPetition` increments `verifiedCount` once and does not re-check.

**Status:** Accepted remaining-work record. Not implemented.

**Source:** D-2026-09-09-08 + this implementation pass.

---

## 33. On-Chain Vote Secrecy Design (D-2026-09-16-02)
**Date:** 2026-09-16

> Superseded by 31. Blockchain Votes Default to Auditor-Visible Records (D-2026-10-09-01).

**Decision:** Do **not** patch `Referendum.vote()` in this change. Design first, then change `vote()`, tally, ABI, and referendum UI together.

**Problem:** Solidity storage and calldata are public. `mapping(address => uint256[]) public ballots` lets anyone read how an address ranked. `vote(uint256[] rankedChoices)` also publishes the ranking in the transaction. Making the mapping `private` does not hide it. On-chain first-choice counters updated inside `vote()` can also leak preference when combined with `VoteCast` timing.

**Design (pending Chief Architect approval before any contract change):**

1. **Stop sending rankings to the contract.** `vote()` should only record that an eligible, education-acknowledged member participated: `hasVoted`, `totalVotes`, `VoteCast(address indexed voter)` with no ranking.
2. **Raw ballots stay encrypted off-chain**, same family as community votes (`lib/ballot-crypto`). Ordinary APIs return receipts without choices. Keep historical ciphertext versions if vote-change is allowed ? do not destroy ballot history.
3. **Tally is a separate step**, not inside `vote()`. Do not update public `optionVotes` from a revealed first choice at cast time.
4. **Optional on-chain commitment later:** `vote(bytes32 commit)` where `commit = keccak256(abi.encode(ranking, salt))`. A commitment is still identity-linked; it is not a secret ballot by itself. Prefer encrypted off-chain storage plus an optional Merkle root of ciphertext hashes anchored after close for tamper-evidence.
5. **ABI:** remove public `ballots(address)`; keep `acknowledgeEducation` / `hasAcknowledgedEducation`; `vote()` with no ranking (or commit only); drop in-tx ranking tallies; optional `anchorTally(bytes32 merkleRoot, uint256[] counts)` once after `endTime`, callable by the organization ? counts are aggregates, not per-voter rankings.
6. **UI:** stop reading `ballots(address)` for "Your vote". Show a private receipt instead. Education gate unchanged.
7. **Out of scope here:** mixers, ZK, coercion-resistant E2E. Those are future. Community orgs already closer to Article VI.

**Status:** Superseded by decision 31. Auditor-visible sealed ballots shipped. This design was not the one built.

**Source:** Constitution Article VI section 2, D-2026-09-09-07, security architecture, this audit.

---

## 32. Perspectives Maps Onto The Three Information Levels (D-2026-09-16-01)
**Date:** 2026-09-16

> Superseded by 38. Pros vs Cons Sits Inside the Quick Debrief (D-2026-10-28-01). This applies to the separate Pros vs Cons step. The Perspectives name remains.

**Decision:** **Perspectives** remains the member-facing name. Inside that panel, content is ordered as:

1. **Quick Debrief** ? what / why / known / disputed / uncertain
2. **Pros vs Cons** ? existing For/Against (or other) perspective cards
3. **Evidence**
4. **Sources**

This is the north-star three-level architecture inside the existing name. It is not a third information architecture and does not rename the tab.

**Why:** D-2026-09-09-06 required mapping without losing "Perspectives". The running app now shows that mapping so it can be confirmed.

**Status:** The separate Pros vs Cons step is superseded by 38 (D-2026-10-28-01). The Perspectives name remains.

**Source:** Chief Architect decision D-2026-09-09-06 + this implementation.

---

## 31. Blockchain Votes Default to Auditor-Visible Records (D-2026-10-09-01)
**Date:** 2026-10-09

> Extended by 43. Non-Blockchain Platform and Solo-Maintainable Organization Voting (D-2026-10-30-01). The record no longer depends on a blockchain. The organization toggle stays, and changing it shows a warning modal with what is affected, the pros and cons, and a confirmation.

**Decision:**
- The goal is to make voting as secure and trusted as a bank transaction. The way to get there is to copy how banks do it: an appointed party can trace the record, the public sees the result, and misuse of that record is punished. Elections people trust are what make a fluid democracy usable, including frequent referendums and the further features that depend on a result people believe.
- Blockchain votes default to **auditor-visible**. An organization can turn that off.
- The people who can see who voted how are the counters the organization appoints, using the same kind of appointment already used for people who count paper ballots.
- Everyone else sees the tally. They do not see the person-to-choice link.
- A voter is told the ballot was accepted and counted. They do not get a shareable proof of the choice.
- The setting lives on the organization, not on the ballot card. It applies to votes started after it is saved. An open vote keeps the rule it started with. The counter can be replaced and can finish a count already underway.
- If auditor visibility is on, leaking or selling how someone voted should be punished. The setting screen says that, along with the tradeoff: this mode is the strongest way to check an online vote, and a secret count cannot be checked person by person.
- On chain, a vote transaction no longer carries a plaintext ranking. The sealed ballot is readable by the appointed counter. A secret referendum stores no choice in the contract. `Referendum.ballots` is gone.

**Why:** An earlier constitution draft made total secrecy the default. That draft is withdrawn for blockchain votes. A checkable count, held the way a bank holds a payment record, is the practice that makes the result trustworthy. The benefits of that count outweigh the cost of letting the appointed counters see individual ballots, as long as the public cannot, and as long as leaking the record is punished. An organization that wants a traditional secret count can turn the record off and accept a weaker proof.

**Status:** Accepted. Constitution Article VI, the governance principles, the security architecture, the north star, and the master plan are amended to match.

**Source:** Chief Architect decision, 2026-10-09. Wording edited by the Chief Architect on 2026-10-15. Supersedes the secrecy-is-the-default wording, decision-log entry 22 (D-2026-09-09-07), and research Decision 009.

---

## 30. Source available; production use requires a paid license (D-2026-09-15-01)
**Date:** 2026-09-15

**Decision:** SuperDemocracy is no longer AGPL (or MIT). The GitHub repository stays public so people can inspect the code, fork, and contribute. The [LICENSE](LICENSE) allows reading, contributing, and local evaluation only. Hosting for real members or real votes, or selling access, requires a commercial license from Dustin Murray. Contributors grant Dustin Murray the right to use and commercially license their patches. AGPL dual-license (entry 29, D-2026-09-14-01) is superseded.

**Why:** The Chief Architect wants contributors and inspectable voting code, not a free giveaway of the product. AGPL still allowed unpaid production hosting.

**Status:** Accepted. Plain-language license, not lawyer-drafted.

**Source:** Chief Architect decision.

---

## 29. Dual License: AGPL Plus Commercial (D-2026-09-14-01)
**Date:** 2026-09-14

> Superseded by 30. Source available; production use requires a paid license (D-2026-09-15-01).

**Decision:** The public SuperDemocracy repository is licensed under GNU Affero General Public License v3.0 or later. Organizations that cannot or do not want to comply with the AGPL may obtain a separate commercial license from the copyright holder (Dustin Murray). The commercial contract is not in git; [COMMERCIAL.md](COMMERCIAL.md) only states that the option exists.

**Why:** MIT would let a vendor host a closed fork and sell it without contributing back. AGPL keeps network-hosted modifications inspectable. A commercial license is how unions, cities, or hosts that need proprietary terms can still pay for that path. The short MIT file on `main` (2026-09-12) is superseded before the repository goes public.

**Status:** Superseded by 30. Source available; production use requires a paid license (D-2026-09-15-01).

**Source:** Chief Architect decision.

---

## 28. Canonical Wording: Community-Org Education Gate Exception (D-2026-09-10-01)
**Date:** 2026-09-10

**Decision:** The Chief Architect approved amending the Constitution (Article II Section 3), North Star, Governance Principles (v0.3), and Master Plan so Education Before Vote is a core gate on by default everywhere, with one exception: community organizations may turn the UI gate off in their settings. Governance organizations cannot; on-chain referendums keep contract enforcement.

**Why:** Article X Section 2 requires an explicit record when Superdemocracy departs from "not an optional organization setting." The 2026-09-09 decision (entry 20, D-2026-09-09-05) is now in the canonical documents, not only in this log.

**Status:** Accepted.

**Source:** Chief Architect approval, 2026-09-10.

---

## 27. Existing Scope Beyond the Handoff Goal Stays (D-2026-09-09-12)
**Date:** 2026-09-09

**Decision:** The tree contains community orgs, member messaging, invites, encrypted community votes, and more, a larger surface than the handoff's "stabilize live petition data" goal. Anything already built stays; it is there for a reason. Features are not removed to match a narrower document. If something built conflicts with a principle, log it here and raise it.

**Status:** Accepted.

**Source:** Chief Architect decision.

---

## 26. Referendum Constructor Includes `organization` (D-2026-09-09-11)
**Date:** 2026-09-09

**Decision:** The constructor is `(title, description, options, startTime, endTime, identityVerifier, organization)`. `organization` binds a referendum to the org that launched it via `ReferendumFactory`. The specification was updated to match the code.

**Why:** The spec listed six arguments; the implementation has seven and is correct.

**Status:** Accepted.

**Source:** Implementation + Chief Architect decision.

---

## 25. `Voting.sol` Is Legacy (D-2026-09-09-10)
**Date:** 2026-09-09

**Decision:** `contracts/src/Voting.sol` (the original toy poll: public counts, no identity, no education, no ranked ballots) is kept so nothing breaks but is not the direction and must not be extended. The handoff documents define what is being built instead. Removal can be scheduled once nothing references it.

**Status:** Accepted. File removed; nothing referenced it.

**Source:** Chief Architect decision.

---

## 24. Global Verification and Per-Organization Verification Are Different Things (D-2026-09-09-09)
**Date:** 2026-09-09

**Decision:**
- **Global verification:** the person is a verified individual (government ID or equivalent). Required for government and other high-stakes organizations that use the chain. Not implemented for real yet; `IdentityMock` stands in for it locally.
- **Per-organization verification:** the person meets *that organization's* join requirements, granted by that org's admin. It does **not** make the person globally verified.
- **Community orgs have no verified-join gate.** Anyone can apply; the admin decides.
- Each organization defines its own join requirements. Reference example: a union requires a member card number checked against the union's database, or the applicant enters the number and uploads a photo of the card and an admin approves manually when reviewing the application.

**Why:** Early on, members could not be added to a group before being globally verified. The org-admin-can-verify workaround is why `IdentityMock` and the admin flows look the way they do. Keeping the two concepts distinct prevents a per-org approval from leaking into global identity.

**Status:** Accepted. `IdentityMock.setVerified` being unrestricted is acceptable **only** as a local mock; production identity is a separate component.

**Source:** Chief Architect decision + implementation history.

---

## 23. Post-Approval Re-Verification Caveat and Eligibility Monitoring (D-2026-09-09-08)
**Date:** 2026-09-09

**Decision:**
- Signatures collected before approval must be re-verified after approval, **unless** the signer is **globally verified** (uploaded government ID and passed verification).
- No real government-ID verification path exists today, so the caveat is **benched**: until then, all signers are re-verified.
- Petition signatures are **actively monitored**. A signer who becomes ineligible to vote in that jurisdiction (death, moving out of the jurisdiction, loss of membership) has their signature removed and counts recomputed.

**Why:** Re-verifying an already globally verified person is redundant; monitoring keeps petition counts honest over time.

**Status:** Accepted. Neither exists in `Organization.sol` yet (`signPetition` increments `verifiedCount` once).

**Source:** Chief Architect decision.

---

## 22. On-Chain Vote Secrecy Defect Will Be Fixed by Design, Not Patched (D-2026-09-09-07)
**Date:** 2026-09-09

> Superseded by 31. Blockchain Votes Default to Auditor-Visible Records (D-2026-10-09-01).

**Decision:** `Referendum.ballots[address]` is a public voter-to-ranking map and violates the earlier secrecy-default reading of Constitution Article VI Section 2. It will be fixed, but only after a design that changes `vote()`, tallying, the ABI, and the referendum UI together. Community-org ballots are already encrypted (`lib/ballot-crypto`) and are closer to the rule.

**Why:** A quick storage change would likely break voting entirely.

**Status:** Superseded by 31. Blockchain Votes Default to Auditor-Visible Records (D-2026-10-09-01). The public ranking map was still a defect. The fix keeps a sealed person-to-choice record for the appointed counter instead of deleting the link for everyone.

**Source:** Chief Architect decision + audit.

---

## 21. "Perspectives" Is the Member-Facing Name for the Information Layer (D-2026-09-09-06)
**Date:** 2026-09-09

**Decision:** The existing **Perspectives** tab on referendums is the home of the Pros vs Cons layer described in the canonical documents. It is not a competing feature. The three-level information architecture (Quick Debrief / Pros vs Cons / evidence and sources) will be mapped onto it without losing the neutral name.

**Why:** "Perspectives" was chosen deliberately as a neutral label instead of "Get educated" or similar.

**Status:** Accepted in principle; exact mapping open. Dustin wants to look at the running app first.

**Source:** Chief Architect decision + existing implementation.

---

## 20. Education Before Vote for Community Orgs Is a Toggleable UI Gate (D-2026-09-09-05)
**Date:** 2026-09-09

**Decision:**
- **Governance organizations (on-chain referendums):** the gate stays contract-enforced (`Referendum.acknowledgeEducation()` before `vote()`).
- **Community organizations (off-chain):** the gate is a **UI gate only**, no contract, no chain. It is **on by default** ("soft default") and an org admin may turn it off in the org's settings.

**Why:** Community orgs are low-stakes and off-chain; requiring a chain-enforced gate there is disproportionate. The gate still exists everywhere by default.

**Explicit departure (Constitution Article X Section 2):** Education Before Vote remains a core gate and is on by default. It is optional **for community orgs only**. Canonical wording was amended 2026-09-10 after Chief Architect approval.

**Status:** Accepted. Canonical documents amended. The community-org UI gate is in org settings, and the launch checklist marks it done. See [plan/todo.md](plan/todo.md).

**Source:** Chief Architect decision.

---

## 19. Deploy With `deploy.sh` and `cast send`, Never `forge create` (D-2026-09-09-04)
**Date:** 2026-09-09

**Decision:** `contracts/deploy.sh` is the deployment path and is committed. It restarts Anvil, deploys `IdentityMock`, then `ReferendumFactory`, then `GroupRegistry` with `cast send --create`, pre-verifies the five default Anvil accounts on `IdentityMock` (local dev only), and writes the `NEXT_PUBLIC_*` addresses into `.env.local`.

**Why:** The script was left in the WSL checkout when the repo moved to one Windows clone. `forge create` repeatedly failed against this setup. The key in the script is Anvil's public default account 0, test material, not a secret.

**Status:** Accepted.

**Source:** Implementation experience + Chief Architect decision.

---

## 18. Local Anvil Is Chain 31338 on Port 8546 (D-2026-09-09-03)
**Date:** 2026-09-09

**Decision:** The project's local Anvil runs at `http://127.0.0.1:8546`, chain id `31338`. The handoff copies of the Master Plan and Specification said `31337` / `8545` (Anvil defaults) and were corrected on import.

**Why:** `lib/web3.ts`, `lib/web3-server.ts`, and `deploy.sh` all use `31338` / `8546`, and the Chief Architect confirmed those values. Always verify the running node (`cast chain-id --rpc-url http://127.0.0.1:8546`) before debugging the frontend.

**Status:** Accepted.

**Source:** Chief Architect decision + implementation.

---

## 17. In-Repo Document Authority Follows the Constitution (D-2026-09-09-02)
**Date:** 2026-09-09

> The rank of the decision log against the North Star and Master Plan is updated by 39. A Logged Decision Can Override the Starting Plan (D-2026-10-29-01). Code still does not outrank the vision.

**Decision:** The in-repo authority order ([plan/README.md](plan/README.md)) is the Constitution's order (Article XI). The previous in-repo ordering that ranked "current code" first is superseded. Code describes what *exists*; it does not *outrank* the vision documents. Code/doc conflicts are logged here and decided, never resolved by assuming the code is right.

**Why:** The handoff package is the current canonical set and outranks the older plan documents.

**Status:** Accepted.

**Source:** Chief Architect decision + Constitution Article XI.

---

## 16. Per-Organization Feature Toggles (D-2026-09-09-01)
**Date:** 2026-09-09

**Decision:** Citizen-initiative flows (petition, then approval, then launch) are an **organization setting**, not a platform constant. Each organization gets a settings dashboard with feature toggles: initiatives on/off, Education Before Vote on/off for community orgs, and future features, each with its own default.

**Why:** The flow exists in `Organization.sol`, but most real organizations do not allow member-initiated proposals today. Forcing it on would misrepresent how they govern.

**Status:** Accepted. On 2026-09-09 this was documented only, so that day's work would not be sidetracked. Org settings now include the citizen-initiative and Education Before Vote toggles.

**Source:** Chief Architect decision.

---

## 15. Soft-Default Warning Modal
**Date:** 2026-09-08

> Accepted by 43. Non-Blockchain Platform and Solo-Maintainable Organization Voting (D-2026-10-30-01). The modal applies to any setting that affects security, integrity, how voters see information, or the vote itself.

**Decision:** Bookmark a possible UI feature: when an organization changes a configurable governance setting away from the Superdemocracy soft default, show a warning explaining why the default exists, the main tradeoff or danger of changing it, and links to supporting research where available.

Example use: disabling Expert Qualification could warn that popular or charismatic non-experts may accumulate delegated influence.

**Why:** Configuration should remain possible, but organizations should understand why evidence-backed defaults exist before moving away from them.

**Status:** Tentative / UI bookmark. Not a constitutional requirement.

**Source:** Chief Architect idea.

---

## 14. Canonical Document Hierarchy
**Date:** 2026-09-08

> The rank of the decision log against the Master Plan is updated by 39. A Logged Decision Can Override the Starting Plan (D-2026-10-29-01).

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

## 13. No Automatic Chief Architect Succession
**Date:** 2026-09-08

**Decision:** The Chief Architect may name a successor later but no person automatically inherits the role.

If the Chief Architect becomes permanently unavailable without naming a successor, the public work remains available under its applicable licenses and may be studied, preserved, forked, adapted, or continued by others.

**Why:** There is currently no collaborator or institution that should be granted fictional authority simply to fill a succession chart.

**Status:** Accepted.

**Source:** Chief Architect decision.

---

## 12. Election-Critical Verification Does Not Require Every Component To Be Open Source
**Date:** 2026-09-08

**Decision:** Components and protocols whose transparency is necessary to verify election integrity or cryptographic claims must be sufficiently inspectable for independent verification. The Constitution does not require every commercial component of the platform to be open source.

**Why:** Public verification of election-critical claims is non-negotiable; unrelated commercial implementation does not automatically require publication.

**Status:** Accepted.

**Source:** Chief Architect decision.

---

## 11. AI May Assist; Organizations Decide Whether It May Receive Political Authority
**Date:** 2026-09-08

**Decision:** AI may assist with information gathering, Education Before Vote, source organization, summarization, deliberation, administration, analysis, accessibility, and other useful platform functions.

Organizations decide for themselves whether AI may ever receive delegated political authority.

If an organization permits AI to receive political authority, AI cannot create, enlarge, or perpetuate its own authority, and lawful democratic mechanisms must remain able to withdraw it.

**Why:** Superdemocracy provides governance capabilities rather than prescribing whether an organization should delegate votes or governing authority to AI.

**Status:** Accepted.

**Source:** Founding manuscript + Chief Architect decision.

---

## 10. Proactive Emergency Protocols
**Date:** 2026-09-08

**Decision:** Superdemocracy provides organizations with the ability to create proactive emergency protocols before a crisis occurs and encourages preparation for foreseeable emergencies.

The value is that deliberation and decision-making occur before the crisis, allowing an already-decided response to be executed rapidly when needed.

If no applicable Superdemocracy protocol exists, the platform falls back to the organization's legitimate pre-existing governance and emergency processes.

**Why:** Emergency speed should come from prior deliberation rather than improvised powers created in the pressure of the event.

**Status:** Accepted.

**Source:** Founding manuscript + Chief Architect decision.

---

## 9. Policy Outcome Measurement Is Case-Specific
**Date:** 2026-09-08

**Decision:** When a chosen policy has measurable implementation goals, Superdemocracy may help record them, but the organization or decision defines those goals.

**Why:** The platform does not know the desired direction before the democratic decision has been made and should not invent universal policy-success metrics for organizations.

**Status:** Accepted.

**Source:** Chief Architect decision.

---

## 8. Adaptive Governance Feedback
**Date:** 2026-09-08

**Decision:** Feedback questions should be lightweight and may change according to what the project is trying to learn. The same long survey should not be forced after every decision.

**Why:** Different governance methods create different uncertainties. The platform should ask the smallest useful set of questions needed to learn from a particular experiment while avoiding survey fatigue.

**Status:** Accepted.

**Source:** Chief Architect decision.

---

## 7. Governance Measurement Targets the Citizen Experience
**Date:** 2026-09-08

**Decision:** Superdemocracy will measure governance experience, not assume that every vote has one predetermined policy objective.

The broad measurement goals are increased satisfaction with organizational decision-making, trust, perceived voice, information quality, legitimate acceptance of results, reduced tribalism/polarization, nuanced discussion, and useful participation.

Raw participation is retained but is not interpreted as success by itself.

**Why:** A vote chooses a direction between competing ideas. Process health and policy implementation outcomes are different things. The platform should learn from lightweight feedback in the same way a product learns from customer experience.

**Status:** Accepted.

**Source:** Founding manuscript + Chief Architect decision.

---

## 6. Expert Qualification Is the Soft Default for Delegation
**Date:** 2026-09-08

**Decision:** When liquid delegation is enabled, Expert Qualification is the Superdemocracy soft default for eligibility to receive topic-specific delegations. Organizations may turn the qualification feature off.

**Why:** The founding manuscript identifies a major failure mode in unqualified liquid delegation: viral, famous, charismatic, or popular people can gather political influence without relevant expertise, recreating the demagogue problem.

Qualification may use relevant education or certification, professional experience, accomplishment or success in the field, proven proficiency, or other organization-defined evidence appropriate to the topic.

**Status:** Accepted.

**Source:** Founding manuscript + Chief Architect decision.

---

## 5. Topic-Specific Delegation With Immediate Revocation
**Date:** 2026-09-08

**Decision:** When liquid delegation is used, delegation is topic-specific and delegated authority must be withdrawable immediately.

**Why:** Liquid democracy is useful because authority remains fluid. A participant may trust different people on different topics and must be able to take authority back without waiting for an election cycle.

A later delegation change does not rewrite a historical ballot already validly cast.

**Status:** Accepted.

**Source:** Founding manuscript + Chief Architect decision.

---

## 4. Multiple-Option / IRV Soft Default
**Date:** 2026-09-08

**Decision:** When a question genuinely has several viable solutions, Superdemocracy's soft default is to present multiple meaningful options rather than artificially force the issue into Yes/No. Ranked-choice / instant-runoff voting is the preferred default counting method for such decisions.

Binary voting remains appropriate for genuinely binary questions.

**Why:** The founding manuscript argues that many political questions are contests among several possible solutions and that reducing them to a one-versus-one choice can unnecessarily reinforce polarized camps.

**Status:** Accepted.

**Source:** Founding manuscript + Chief Architect decision.

---

## 3. Education Before Vote Is a Core Gate
**Date:** 2026-09-08

**Decision:** Users are required to open or acknowledge the relevant educational information before casting a vote.

**Why:** Education Before Vote is a founding feature of Superdemocracy and is already implemented in the existing Demos application. The gate places information directly in the path of the decision without pretending to prove that a voter became informed.

**Status:** Accepted. Refined 2026-09-10: still a core gate and on by default; community organizations may disable the UI gate. See entry 20 (D-2026-09-09-05).

**Source:** Founding manuscript + Chief Architect decision + existing implementation.

---

## 2. Founder-Led Project Stewardship
**Date:** 2026-09-08

**Decision:** While the project is founder-led, the Chief Architect has final authority to approve or reject canonical project changes and public contributions.

**Why:** The role exists only to preserve coherence during development while the public GitHub project remains founder-led.

**Status:** Accepted.

**Source:** Chief Architect decision.

---

## 1. Constitution Scope
**Date:** 2026-09-08

**Decision:** The Superdemocracy Project Constitution governs the Superdemocracy project and platform design. It does not impose a political constitution on organizations that use the platform.

**Why:** Superdemocracy is Government as a Platform. Adopting organizations remain responsible for their own legitimate governance rules and jurisdiction.

**Status:** Accepted.

**Source:** Chief Architect decision.

---

# HOW TO ADD FUTURE ENTRIES

Add an entry when a future contributor would reasonably ask:

> "Why does Superdemocracy work this way?"

If the answer is important to the philosophy, security, architecture, or governance model, record it here.

If the answer is merely "because this React component was easier to write this way," Git history is enough.

Put the new entry at the top of the list. Number it with the next integer. Leave every older number where it is. If the new entry replaces an older one, add the superseded footnote to that older entry.

The Constitution is the rulebook. The system specification, the security architecture, and the governance measurement document are the technical codes (D-2026-10-29-03). A later entry wins over them. If a proposed decision conflicts with any of them, warn the Chief Architect before writing the entry. The Chief Architect then decides whether to override. If the override goes ahead, the entry includes the discussion summary and the reasons. The overridden clause gets a footnote: "amended by decision #x".
