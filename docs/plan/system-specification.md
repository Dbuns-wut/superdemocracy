# SUPERDEMOCRACY — SYSTEM SPECIFICATION

**Status:** Living engineering specification.  
**Authority:** The [Constitution](constitution.md) is the rulebook. This specification is a technical code under it. A later entry in [../DECISION-LOG.md](../DECISION-LOG.md) wins over both after a warning (D-2026-10-29-03). When this document and the code disagree, record it in the decision log and decide — do not assume the code is right.  
**Current priority:** On the launch checklist, not in this file. See [todo.md](todo.md).

*Amended by decision #43 (D-2026-10-30-01): the rules layer is the application server, not smart contracts. Accounts are email and password; no wallet, extension, or chain is required. Sections 3, 7, 8, 9, and 10 were rewritten to match.*

## 1. Product Model
Superdemocracy is a governance platform with two broad organization kinds:
- **Community Organizations:** polls, votes, messageboard, events, and membership for groups that run themselves.
- **Governance Organizations:** the same voting tools with stricter defaults. Education Before Vote is locked on. Petitions and referendums for this kind are deferred (decision #43) and will build on the same vote primitives.

Both kinds are the same record type with a `kind` field. The distinction is in defaults and which settings an administrator may change.

## 2. Rules / Data / Experience
### Rules Layer
The server (Next.js route handlers and the stores under `lib/`) enforces:
- who is signed in (session cookie → account id)
- eligibility and membership
- who may create a vote or poll (organization administrator / member)
- vote state (active, closed, verification, certified)
- Education Before Vote acknowledgement before a ballot is accepted
- ballot storage and encryption
- who may read ballots (only the appointed counter, only while verification is open; the administrator is refused)
- vote validity (one ballot per participant unless the vote allows changes)

Every privileged action is checked on the server. Hiding a control in the UI is never the only check.

### Data Layer
External content/evidence can include:
- arguments and perspectives
- studies and documents
- citizen discussion
- expert commentary
- source references
- timestamps and content identifiers

Education content lives beside the vote, not inside the vote record.

### Experience Layer
Next.js frontend handles:
- feeds, search, tabs
- education (Perspectives)
- voting UI
- results
- organization UX

The frontend must never be the security boundary. Rules must never depend on user-interface behavior.

## 3. Current Server Architecture
### Accounts and sessions
- `lib/auth/accounts.ts`: accounts with scrypt-hashed passwords; `createAccount`, `loginAccount`, `changePassword`.
- `lib/auth/session.ts`: `sessionAccount(request)` and `requireAccount(request)` read the `sd_session` cookie. The account id (UUID) is the participant id everywhere.
- `lib/identity/*`: display profile per account (`accountId`), separate from governance records.

Identity remains separate from governance so the verification mechanism can later be replaced without rewriting governance logic.

### Organizations
- `lib/community-orgs/store.ts`: `CommunityOrg { id, title, description, kind, membershipMode, creatorId, auditorId?, auditorVisibleBallots?, createdAt }`.
- Membership modes: `Open` (join directly) and `Manual` (apply, administrator approves, optional invites).
- The creator is the administrator. The administrator may appoint one counter (`auditorId`) who is not the administrator.

### Votes
- `lib/votes/store.ts`: `CommunityVote { id, orgId, title, description, options, startTime, endTime, eligibleVoters, allowVoteChange, auditorVisible, status, verificationApprovals, createdAt }`.
- Ballots are encrypted at rest (`lib/ballot-crypto.ts`, AES-256-GCM under `BALLOT_ENCRYPTION_KEY`). The choice is never stored in plaintext.
- `castCommunityBallot` requires an active vote and an eligible, signed-in participant.
- `getCommunityVotePublic(voteId, viewerId)` returns the tally and, for the viewer only, `mySubmission`.
- `listAuditorBallots` returns person-to-choice records only to the appointed counter while the vote is in `verification`. Every read is written to the append-only audit log.

### Education
- `lib/education/store.ts`: education content per vote and the acknowledgement record per (vote, account).
- `/api/votes/cast` returns HTTP 428 when the gate is on and the participant has not acknowledged.

### Polls, messageboard, events, invites, messages
Lighter-weight community tools on the same account id. Polls are not votes: they have no encryption, no counter, and no verification window.

### Storage
Postgres when `DATABASE_URL` is set (`lib/db.ts`, `scripts/migrate.ts`); otherwise JSON files under `data/` for local development.

## 4. Hard Governance Rules
- Only signed-in members of an organization may cast a ballot or answer a poll.
- Only the organization administrator may create a vote, edit its education, open or close verification, or change organization settings.
- The administrator cannot read ballots.
- The appointed counter can read ballots only while verification is open.
- A ballot cannot be cast outside the vote's start and end time or while the vote is not `active`.
- Education Before Vote is on by default and locked on for Governance organizations.
- Changing a setting that affects security, integrity, how voters see information, or the vote itself shows a warning with what is affected, the pros and cons, and a confirmation (decision #43, entry 15).
- Petition rules from the previous architecture (threshold, re-verification, active monitoring of signer eligibility — D-2026-09-09-08) carry forward unchanged when petitions return.

## 5. Voting Architecture
Store auditor-visible sealed ballots, separate from the tally (D-2026-10-09-01).

Required principles:
- store auditor-visible sealed ballots
- never mix ballot storage with tally calculation
- never destroy vote history
- keep identity separate from governance
- keep tally logic out of the cast path
- do not accept a vote outside the explicit vote state
- write an audit log entry for every privileged read or lifecycle change
- preserve storage for future counting methods (ranked ballots stay representable as ordered option indexes)
- administrators cannot modify votes or tallies

Future counting methods are on the parked list. See [todo.md](todo.md).

## 6. Education Gate
Users are required to open or acknowledge the relevant educational information before casting a ballot. This is a core Superdemocracy gate; it is on everywhere by default.

- **Governance organizations:** the server requires an acknowledgement before accepting a ballot. Organizations may not turn this off.
- **Community organizations:** on by default and server-enforced while on. An organization administrator may turn it off in the organization's settings after the warning modal (D-2026-09-09-05, amended by decision #43).

The member-facing name is **Perspectives**. Pros vs Cons sits inside the Quick Debrief (D-2026-10-28-01).

The gate is not intended to certify competence or comprehension.

## 7. Frontend
Stack:
- Next.js 16 / App Router
- React 19
- Tailwind 4
- `@tanstack/react-query`

Client identity comes from `useSession()` (`lib/auth/use-session.tsx`). People are shown by name through `usePeople` / `PersonPicker`; account ids are never shown as the primary label.

Current vote UI includes:
- title, description, window, status
- Perspectives (education) and acknowledgement
- ballot options and Vote / Change vote
- "Your submission" for the signed-in participant
- results after voting closes (members only)
- verification controls for the administrator and the counter

## 8. Local Development
- `npm install`, `npm run dev`, open `http://localhost:3000`.
- No chain, wallet, or extension. Data lives in `data/*.json` unless `DATABASE_URL` is set.
- `BALLOT_ENCRYPTION_KEY` is required to cast ballots.

## 9. Deployment
Standard Next.js deployment. Server-only secrets (`DATABASE_URL`, `BALLOT_ENCRYPTION_KEY`) stay in the host's environment and are never exposed as `NEXT_PUBLIC_*`.

## 10. Debugging Order
1. Confirm the session: is the request carrying `sd_session`, and does `sessionAccount` resolve it?
2. Confirm the record: does the organization / vote exist with the expected `kind`, `status`, and membership?
3. Check the server rule that refused the action (the API returns the reason).
4. Check the frontend read/write logic and stale client state.
5. Clear `.next` and rebuild only after the above.

Do not repeatedly retry without identifying the root cause.

## 11. Forward Compatibility
Do not optimize V1 in ways that make future architecture impossible. In particular, keep ballots encrypted and separately stored, keep the audit log append-only, and keep participant ids opaque so a stronger identity provider can replace the current one.

Parked future features are listed outside this repo. See [todo.md](todo.md).

## 12. Current Engineering Goal
The current goal is on the launch checklist. See [todo.md](todo.md).

The wedge is organization voting one builder can maintain: create organization → manage eligible members → create vote → cast vote → review own submission → authorized counting and review → finalize result (decision #43). Community orgs, messaging, invites, and encrypted votes stay (D-2026-09-09-12).
