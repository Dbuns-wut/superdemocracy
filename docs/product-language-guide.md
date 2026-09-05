# Product Language Guide — Community Orgs

This guide keeps product messaging aligned with the current architecture and roadmap.

## Positioning rules

- Community org voting is **off-chain**.
- Users should not need to understand blockchain to use community org features.
- Security claims should describe user-visible outcomes (authenticated voter, tamper resistance, auditability), not protocol internals.

## Preferred wording

- "Secure off-chain voting"
- "Verified voter action"
- "Signed vote request (no transaction fee)"
- "Private ballot handling"
- "Auditor-only verification workflow"
- "No gas fee required for community voting"

## Avoid in member-facing UX

- "Broadcast transaction"
- "Submit on-chain vote" (for community-org vote/poll flows)
- "Wallet transaction required" (unless actually true)
- "Smart contract interaction" in basic community voting screens
- Any copy that implies community voting writes to chain

## UI copy examples

- Vote button helper text: "Your vote is authenticated with a free signature."
- Signature prompt context: "Confirm to securely submit your vote (no blockchain fee)."
- Error state (signature cancelled): "Vote not submitted. Signature request was canceled."
- Success state: "Vote submitted securely."

## Internal messaging (docs/sales/ops)

- Community orgs: fully off-chain vote execution and storage path (current persistence implementation may change over time).
- Authentication: signed request proves voter intent and wallet control; nonce + expiry prevent replay.
- Future UX direction: move toward passkeys/SSO/session flows while preserving equivalent backend security guarantees.

## Review checklist for new copy

- Does this text imply a paid transaction for community votes? If yes, rewrite.
- Does this text expose unnecessary blockchain mechanics to end users? If yes, simplify.
- Does this text preserve truthful security claims? If no, tighten wording.
- Is on-chain referendum language separated from community-org language? If no, split it.
