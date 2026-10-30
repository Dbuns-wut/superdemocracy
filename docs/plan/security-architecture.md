# SUPERDEMOCRACY — SECURITY ARCHITECTURE

*Amended by decision #43 (D-2026-10-30-01): the platform no longer depends on a blockchain. The server is the rules layer. Sections that described the chain's role were replaced with the server-trust model and the controls that exist today. Nothing here claims a control exists unless it is implemented.*

## Security Thesis
Votes default to auditor-visible records. The appointed counter can see who voted how, only while the verification window is open. The public cannot.

An organization may turn that record off after a warning. A secret count keeps no person-to-choice link and is harder to prove honest.

The objective is a tally anyone can see, plus a person-to-choice record that exists only for the appointed counter when the organization has left auditor visibility on.

Mobile banking is the model: strong account security, one clear confirmation per action, a record the participant can review, and an investigation path when something looks wrong. That is a design goal, not a claim that the application meets banking standards today.

## Threat Model
The architecture must consider:
- compromised voter devices
- stolen credentials
- compromised identity services
- malicious or compromised frontend code
- compromised backend services or database
- compromised encryption key
- insider abuse
- metadata deanonymization
- coercion and vote buying
- replay/double voting
- malicious administrators
- infrastructure failures

No single technology solves these threats by itself.

## Layered Trust Model
The security model should resemble the strongest lessons from online financial systems combined with the public scrutiny and verification used in mature e-voting programs.

Desired properties:
1. No single compromised component should automatically compromise the election.
2. Critical cryptographic assumptions should be independently reviewed.
3. Critical code should be formally verified where practical.
4. Source code and documentation should be publicly scrutinized where appropriate.
5. Intrusion testing and bug bounties should be continuous rather than one-time.
6. Deployments should be reproducible.
7. Threat models should be public and understandable.

## What Exists Today
Implemented and enforced on the server:
- Passwords are stored as scrypt hashes. Sessions are opaque tokens in an HttpOnly cookie.
- The participant id is the account id. The client never supplies it; the server reads it from the session.
- Ballots are encrypted at rest with AES-256-GCM under a server-only key. The choice is never stored in plaintext.
- Only members may cast; only the administrator may create votes, edit education, or open/close verification.
- Only the appointed counter may read person-to-choice records, only while verification is open. The administrator is refused.
- Every counter read and every verification lifecycle change is appended to an audit log.
- Education Before Vote is enforced at cast time (HTTP 428), not only in the UI.
- A participant can read their own submission and nobody else's.

Not yet implemented (do not claim them):
- independent identity verification (government ID or equivalent)
- independent third-party auditing
- end-to-end verifiability proofs
- tamper-evident anchoring of the audit log outside the database
- rate limiting and anomaly detection on sign-in and casting

## Identity Separation
Identity answers: **Who is eligible?**

The ballot answers: **What was voted?**

These must not become a permanently linkable public record.

Long-term mechanisms may include:
- anonymous credentials
- commitments
- zero-knowledge proofs
- selective disclosure
- threshold cryptography
- secure multi-party computation
- end-to-end verifiability
- coercion resistance

## Vote Privacy
The platform must not expose a public queryable relationship between:
- legal identity and vote
- account and vote
- identity credential and vote
- demographic profile and vote
- delegate and historical vote

When auditor visibility is on, the appointed counter may read that relationship. Nobody else may. Removing a name is not sufficient if other metadata can reconstruct identity for the public.

## Verification at Critical Points
Verification happens at critical submission points: petition submission (when petitions return) and after voting closes, before final acceptance or certification. Suspected tampering is investigated. Confirmed compromised submissions can be invalidated; affected participants are notified and may resubmit. The original record and its resolution are preserved; nothing is silently overwritten (decision #43).

The long-term target: voters can obtain meaningful evidence that their ballot was included and counted correctly without gaining a transferable proof that reveals their vote to another person.

## Sealed Ballots vs Tallies
Store sealed ballots as the durable record when auditor visibility is on. Keep tally logic separate so the public result does not require publishing each choice. A secret count does not store the choice with the voter.

Do not implement complex ranked-choice or other tally algorithms inside the cast path.

## Administrator Boundaries
Admins may control governance workflow where authorized, including opening and closing verification and (later) petition approval.

Admins must never have a privileged path to:
- read ballots
- edit ballots
- delete ballots
- alter vote totals arbitrarily
- rewrite historical decisions

## Server Trust Model
The server is trusted to enforce rules. That trust is bounded by:
- a server-only encryption key, separate from the database
- an append-only audit log of privileged reads and lifecycle changes
- open source code so the rules can be inspected
- (planned) external anchoring of audit log digests and independent review

Do not treat the server as a solution for:
- endpoint compromise
- identity fraud
- coercion
- bad governance rules

## Privacy-Preserving Research Data
Research value is important, but vote secrecy is more important.

V1 should avoid collecting sensitive demographics merely because they might be useful to future AI. Future designs can explore:
- aggregation
- minimum cohort sizes
- anonymized identifiers
- differential privacy
- selective disclosure
- secure computation

Researchers should be able to learn population-level patterns without learning how a specific person voted.

Do not use social-media scraping as a substitute for this architecture.

## Security Program
Before high-stakes deployment, require progressively stronger assurance:
- internal threat modeling
- unit/integration testing
- static analysis
- formal verification of critical components
- cryptographic protocol review
- independent security review
- penetration/intrusion testing
- public bug bounty
- reproducible builds/deployments
- incident response and recovery procedures

## Operational Rule
Every new table that holds participant or organization data ships with access rules. Server-only secrets never reach the client bundle. Diagnose before retrying.

## Guiding Standard
**Don't trust us. Verify us.**
