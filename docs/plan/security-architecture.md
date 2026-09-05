# Security architecture

## Security Thesis
**Never sacrifice vote secrecy for auditability.**

The objective is a system that can be independently verified without creating a public mapping between a person and their vote.

## Threat Model
The architecture must consider:
- compromised voter devices
- stolen credentials
- compromised identity services
- malicious or compromised frontend code
- compromised backend services
- compromised tally infrastructure
- insider abuse
- metadata deanonymization
- coercion and vote buying
- replay/double voting
- smart-contract vulnerabilities
- malicious administrators
- infrastructure failures

Blockchain does not solve these threats by itself.

## Layered Trust Model
The security model should resemble the strongest lessons from online financial systems combined with the public scrutiny and cryptographic verification used in mature e-voting programs.

Desired properties:
1. No single compromised component should automatically compromise the election.
2. Critical cryptographic assumptions should be independently reviewed.
3. Critical code should be formally verified where practical.
4. Source code and documentation should be publicly scrutinized where appropriate.
5. Intrusion testing and bug bounties should be continuous rather than one-time.
6. Deployments should be reproducible.
7. Threat models should be public and understandable.

## Identity Separation
Identity answers: **Who is eligible?**

The ballot answers: **What was voted?**

These must not become a permanently linkable public record.

Long-term mechanisms may include:
- anonymous credentials
- commitments
- zero-knowledge proofs
- selective disclosure
- mixing
- threshold cryptography
- secure multi-party computation
- end-to-end verifiability
- coercion resistance

## Vote Privacy
The platform must not expose a public queryable relationship between:
- legal identity and vote
- wallet and vote
- identity credential and vote
- demographic profile and vote
- delegate and historical vote

Removing a name is not sufficient if other metadata can reconstruct identity.

## End-to-End Verification
The target is not simply “the blockchain says a transaction happened.” Voters should eventually be able to obtain meaningful evidence that their ballot was included and counted correctly without gaining a transferable proof that reveals their vote to another person.

This is essential for both auditability and coercion resistance.

## Raw Ballots vs Tallies
Store raw ballots as the durable record. Keep tally logic separate so future methods can operate over preserved ballots.

Do not implement complex ranked-choice or other tally algorithms inside the basic vote transaction.

## Administrator Boundaries
Admins may control governance workflow where authorized, including petition approval and referendum launch.

Admins must never have a privileged path to:
- edit ballots
- delete ballots
- alter vote totals arbitrarily
- rewrite historical decisions

## Blockchain's Role
Use blockchain for what it does well:
- tamper-evident state
- public or permissioned verification depending on deployment
- deterministic rule enforcement
- independently inspectable history

Do not treat blockchain as a solution for:
- endpoint compromise
- identity fraud
- coercion
- privacy by itself
- bad governance rules
- compromised application code

## Privacy-Preserving Research Data
Research value is important, but vote secrecy is more important.

V1 should avoid collecting sensitive demographics merely because they might be useful to future AI. Future designs can explore:
- aggregation
- minimum cohort sizes
- anonymized identifiers
- differential privacy
- private/off-chain demographic attributes
- selective disclosure
- secure computation

Researchers should be able to learn population-level patterns without learning how a specific person voted.

Do not use social-media scraping as a substitute for this architecture.

## Security Program
Before high-stakes deployment, require progressively stronger assurance:
- internal threat modeling
- unit/integration testing
- contract audits
- static analysis
- formal verification of critical components
- cryptographic protocol review
- independent security review
- penetration/intrusion testing
- public bug bounty
- reproducible builds/deployments
- incident response and recovery procedures

## Operational Rule
Always verify contract bytecode before interacting.

If something appears wrong, check chain ID and Anvil instance first. Diagnose before retrying or redeploying.

## Guiding Standard
**Don't trust us. Verify us.**
