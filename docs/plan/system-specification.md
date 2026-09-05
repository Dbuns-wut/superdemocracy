# System specification

**Status:** Living engineering specification.

**What exists today:** the Next.js app at repo root already ships community organizations (off-chain polls, petitions, and votes). On-chain organizations and referendums are optional. When this document and the code disagree, the code wins — update this file.

**Earlier handoff note:** connecting the frontend to live on-chain petition data without breaking contract architecture. That remains a goal for governance orgs; it is not an excuse to ignore community-org work already in the tree.

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
`(string title, string description, string[] options, uint256 startTime, uint256 endTime, address identityVerifier)`

Current/future ballot architecture must preserve ranked ballots even when the UI temporarily presents Yes/No.

## 4. Hard Governance Rules
- Only verified members can create petitions.
- Only verified members can sign.
- Signatures count only when identity verification is valid.
- A petition must reach its threshold.
- Admin approval can occur before referendum launch.
- Launch requires not rejected, approved, threshold met, and not already launched.
- Admins must be members.
- Petition signatures collected before approval must be re-verified after approval.

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
Current UX requires the voter to open educational information before casting a ballot. The contract may enforce acknowledgement independently of the UI.

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
- multiple simultaneous petitions
- real identity provider integration
- privacy-preserving demographics/research data
- deliberation records
- prediction/forecasting data
- AI-assisted evidence and deliberation

## 12. Current engineering goal
Ship with the code that exists: community orgs first, on-chain governance orgs without breaking contract architecture. Do not expand scope without a reason.
