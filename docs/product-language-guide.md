# Product Language Guide

This guide keeps product messaging aligned with the current architecture and roadmap (decision #43, D-2026-10-30-01).

## Positioning rules

- Signing up is email and password. There is nothing to install.
- Users should not need to understand how the system works internally to use it.
- Security claims describe user-visible outcomes (signed-in voter, encrypted ballot, counter-only review, logged access), not internals.
- Never claim identity verification, independent auditing, or a security control exists unless it is implemented.

## Preferred wording

- "Organization", "member", "administrator", "counter" (the appointed person who may review ballots)
- "Vote" for a governance vote; "poll" for a lightweight question
- "Perspectives" for Education Before Vote content
- "Vote accepted and counted." (do not name the choice on the ballot card)
- "Your submission" when showing a participant their own ballot
- "Verification open / closed" for the review window
- "Secret count" when an organization turns off the auditor-visible record

## Avoid in member-facing UX

- "Transaction", "wallet", "address", "signature", "key", "chain", "gas", "token"
- "Auditor reveal" — say "Counter review"
- "Off-chain" / "on-chain" — the distinction no longer exists
- Any copy that implies a control exists when it does not (for example "independently audited")

## UI copy examples

- Vote button: "Vote" / "Change vote"
- Blocked by the education gate: "Read the education for this vote and confirm before casting your ballot."
- Error state (not signed in): "Sign in first."
- Error state (network): "Could not … Check your connection and try again."
- Success state: "Vote accepted and counted."
- Secret count submission: "Your ballot was recorded. This vote uses a secret count, so your choices are not stored with your name."

## Setting changes

When an administrator changes a setting that affects security, integrity, how voters see information, or the vote itself, show a centered warning modal: what is affected, the pros and cons, and Cancel / Confirm. Use `SettingWarningModal`.

## Internal messaging (docs/sales/ops)

- Ballots are encrypted at rest with a server-only key. The administrator cannot read them.
- The appointed counter can review person-to-choice records only while verification is open, and every read is logged.
- Education Before Vote is enforced by the server, not just the UI.
- Banking-style security is the goal. Say so as a goal, not as a claim.

## Review checklist for new copy

- Does this text name a system internal the member does not need? If yes, simplify.
- Does this text claim a control that is not implemented? If yes, remove it.
- Does this text show success before the server confirmed it? If yes, fix it.
- Is "Community" versus "Governance" organization language kept distinct? If no, split it.
