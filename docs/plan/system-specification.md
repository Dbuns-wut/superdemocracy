# SUPERDEMOCRACY — SYSTEM SPECIFICATION

**Status:** Living engineering specification.  
**Authority:** below the [Constitution](constitution.md), [principles](governance-principles.md), and [master plan](master-plan.md); above the code. When this document and the code disagree, record it in [../DECISION-LOG.md](../DECISION-LOG.md) and decide — do not assume the code is right.  
**Current priority:** Connect the frontend to live petition data without breaking the established contract architecture.

## 1. Product Model
Superdemocracy is a governance platform with two broad organization modes:
- **Community Organizations:** primarily off-chain polls and participation.
- **Governance Organizations:** petitions and referendums with enforceable on-chain rules.

Petitions can remain off-chain until submitted to administration where appropriate, reducing unnecessary gas costs.

## 2. Rules / Data / Experience
### Rules Layer
Smart contracts enforce:
- eligibility
- membership
- verification
- petition creation
- signature rules
- thresholds
- approval/rejection
- referendum launch
- referendum state
- ballot storage
- vote validity

### Data Layer
External content/evidence can include:
- arguments
- perspectives
- studies
- documents
- citizen discussion
- expert commentary
- source references
- timestamps/content identifiers

Do not put this material inside contracts unless there is a compelling protocol reason.

### Experience Layer
Next.js frontend handles:
- feeds
- search
- tabs
- education
- pros/cons
- evidence navigation
- voting UI
- visualizations
- organization UX

The frontend must never be the security boundary.

## 3. Current Contract Architecture
### IdentityMock.sol
- `setVerified(address,bool)`
- `isVerified(address)`

Identity remains separate from governance so the verification mechanism can later be replaced without rewriting governance logic.

### Organization.sol
Core responsibilities:
- members
- admins
- petitions
- petition signatures
- thresholds
- approval/rejection
- referendum launch

Petition fields currently include:
- title
- description
- threshold
- verifiedCount
- approved
- rejected
- referendumLaunched

### Referendum.sol
Constructor:
`(string title, string description, string[] options, uint256 startTime, uint256 endTime, address identityVerifier, address organization)`

`organization` binds the referendum to the org that launched it through `ReferendumFactory` (decision D-2026-09-09-11).

Current/future ballot architecture must preserve ranked ballots even when the UI temporarily presents Yes/No.

## 4. Hard Governance Rules
- Only verified members can create petitions.
- Only verified members can sign.
- Signatures count only when identity verification is valid.
- A petition must reach its threshold.
- Admin approval can occur before referendum launch.
- Launch requires not rejected, approved, threshold met, and not already launched.
- Admins must be members.
- Petition signatures collected before approval must be re-verified after approval, unless the signer is globally verified (government ID). No real global verification exists yet, so today every signer is re-verified (D-2026-09-09-08).
- Petition signatures are actively monitored; a signer who becomes ineligible (death, moved out of the jurisdiction, lost membership) has their signature removed and counts recomputed (D-2026-09-09-08).
- Citizen-initiative flows (petition → approval → launch) are an organization setting, off for orgs that do not allow member initiatives (D-2026-09-09-01).

## 5. Voting Architecture
Raw ballots are preserved separately from result calculation.

Required principles:
- store raw ballots
- never destroy vote history
- do not put complex tally logic inside `vote()`
- avoid loops over voters
- emit events
- support future counting methods
- admins cannot modify votes or tallies

Future methods may include ranked choice, approval, first-past-the-post, Condorcet, quadratic or delegated mechanisms where appropriate. These are capabilities/research directions, not a requirement to enable every method at once.

## 6. Education Gate
Users are required to open or acknowledge the relevant educational information before casting a ballot. This is a core Superdemocracy gate; it is on everywhere by default.

- **Governance organizations (on-chain referendums):** `Referendum.acknowledgeEducation()` is required before `vote()`. The contract enforces it independently of the UI.
- **Community organizations (off-chain):** the gate is a UI gate only — no contract involvement. It is on by default and an org admin may turn it off in the org's settings. Not yet implemented (D-2026-09-09-05, [todo.md](todo.md)).

The member-facing information tab is called **Perspectives**; it is where the Pros vs Cons layer lives (D-2026-09-09-06).

The gate is not intended to certify competence or comprehension.

## 7. Frontend
Stack:
- Next.js 16 / App Router
- React
- wagmi
- viem
- Tailwind

Contract addresses come from `.env.local`. Never hardcode them.

Current referendum UI includes:
- title
- description
- status
- total votes
- results
- voting UI
- wallet
- contract address

Petition feed target:
- All / Signed / Yours
- search
- sorting
- live contract-backed data

## 8. Local Development
Current project state recorded in engineering handoff:
- Anvil local chain
- RPC: `http://127.0.0.1:8546`
- Chain ID: `31338`
- Frontend: `localhost:3000`

Verify actual runtime values before assuming they remain current.

## 9. Deployment
Deployment is handled through `deploy.sh` and `cast send` using bytecode.

**Never use `forge create`.**

After a redeployment, rebuild the frontend:
`rm -rf .next`

Then restart/build as appropriate.

## 10. Debugging Order
1. Verify chain ID and Anvil instance.
2. Verify contract bytecode with `cast code`.
3. Inspect contract storage/state.
4. Check ABI compatibility.
5. Check frontend read/write logic.
6. Check frontend caching.
7. Redeploy only as a last resort.

Do not repeatedly retry without identifying the root cause.

## 11. Forward Compatibility
Do not optimize V1 in ways that make future architecture impossible.

Future capabilities include:
- ranked-choice counting
- switchable counting methods
- topic-specific liquid delegation
- Expert Qualification as the soft default for delegation eligibility
- immediate delegation revocation
- multiple simultaneous petitions
- real identity provider integration
- privacy-preserving demographics/research data
- deliberation records
- prediction/forecasting data
- AI-assisted evidence and deliberation

## 12. Current Engineering Goal
**Connect the frontend to live petition data** without breaking the contract architecture. `app/petitions/page.tsx` already reads live chain logs; finish and stabilize that path.

Do not expand scope until that path is stable. The tree already contains community orgs, messaging, invites, and encrypted community votes — that surface stays (D-2026-09-09-12). Open items: [todo.md](todo.md).
