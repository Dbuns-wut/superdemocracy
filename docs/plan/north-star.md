# North star

**Author:** Dustin Murray  
**Purpose:** The shortest authoritative statement of what Superdemocracy is trying to become.

## Mission
Superdemocracy is a Government-as-a-Platform system for better collective decision-making. It uses technology to make democratic participation easier, more direct, more informed, more accountable, and capable of learning from results.

The goal is not to create a perfect government or replace democracy with technology. The goal is to build a system that can **test, measure, improve, and evolve**.

## Core Principle
**People remain sovereign. Technology improves the machinery.**

Elected officials can remain part of the system, but citizens gain practical tools to initiate, approve, reject, review, and reverse decisions without waiting for the next election cycle.

## Government as a Platform
Superdemocracy provides governance capabilities rather than imposing one universal constitution. Organizations can enable or disable features according to their needs and jurisdiction.

The platform should have a sensible soft default, while advanced mechanisms remain optional.

## Soft Default Decision Process
1. A problem emerges.
2. Choose an appropriate process based on complexity.
3. Make the issue easy to understand.
4. Expose evidence, sources, disagreement, and uncertainty.
5. Deliberate when useful.
6. Choose between For/Against or multiple legitimate options.
7. Vote directly or delegate by topic when delegation is enabled.
8. Implement the decision.
9. Measure outcomes.
10. Learn, revise, or reverse when appropriate.

## Information First
Voting should be easy, but becoming informed should be **ridiculously easy**.

Default information architecture:
- **Level 1 — Quick Debrief:** what are we deciding, why it matters, known/disputed/uncertain, and a PROS vs CONS table for binary questions or benefits/costs/risks for multiple options.
- **Level 2 — Evidence:** claims, evidence for and against, expert statements, statistics, studies, and relevant history.
- **Level 3 — Sources:** legislation, government reports, court decisions, academic papers, accredited reference works, primary sources, datasets, and original documents.

Users must open the educational information before voting in the current system. This is an acknowledgement gate, not a claim that the platform can prove someone became informed.

## Democracy Is an Experiment
The system should be capable of local experimentation. Successful mechanisms can be copied; failed mechanisms can be discarded. Governance should not be forced to evolve only once every four years.

## Competence + Democracy
Citizens retain sovereignty. Specialized decisions may use qualified experts or trusted delegates when the organization enables those mechanisms. Expertise itself must be designed and tested carefully; credentials are not automatically equivalent to competence.

## Liquid Democracy
Delegation is a future capability, not the V1 default.

When enabled, delegation should be **topic-specific**, instantly editable, and instantly revocable. Delegation changes affect future voting authority; historical ballots remain immutable.

Principle: **Permanent historical decisions, impermanent political authority.**

## Security and Privacy
**Never sacrifice vote secrecy for auditability.**

The security objective is not simply blockchain voting. It is a layered, end-to-end verifiable, privacy-preserving, coercion-resistant system in which users do not have to blindly trust the platform.

Target philosophy:
- public scrutiny
- open/reproducible code where appropriate
- independent cryptographic review
- formal verification of critical components
- penetration/intrusion testing
- bug bounties
- threat-model transparency
- separation of identity and ballot
- protection against compromised individual components
- strong privacy and coercion resistance

Blockchain is a tamper-evident governance ledger, not a magic security solution.

## Architecture Rule
Keep three layers separate:

**Rules → Data/Evidence → Experience**

Smart contracts enforce governance rules. Content/evidence lives outside contracts. The frontend presents the experience. Rules must never depend on UI behavior.

## Long-Term AI Direction
AI may eventually become a powerful delegate, administrator, deliberation assistant, forecasting system, or constitutional executive. That is a future research direction, not a V1 feature.

Any future AI authority must remain voluntarily delegated and revocable. Humans determine direction and values; AI can help optimize within those constraints.

## Ultimate Standard
**Don't trust us. Verify us.**
