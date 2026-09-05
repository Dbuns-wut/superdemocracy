# Research and decisions

This document records why major design directions exist, what evidence informed them, and where decisions remain experimental.

## Decision 001 — Government as a Platform
**Decision:** Superdemocracy provides configurable governance capabilities rather than imposing one universal process.

**Why:** Organizations differ. The platform should support a sensible default while allowing features to be toggled on/off.

**Source:** Reordered book manuscript; later project discussions.

## Decision 002 — Information Before Voting
**Decision:** Make information extremely easy to access and require an education acknowledgement before voting in the current implementation.

**Why:** The book identifies informed participation as a central weakness of representative systems. The UX proposal specifically uses a PROS vs CONS presentation for binary questions.

**Important limitation:** The acknowledgement gate does not prove that a person became informed.

## Decision 003 — Three Information Levels
**Decision:** Quick Debrief → Evidence → Source Documents.

**Why:** Preserve a simple first page while allowing serious users to go deeper.

## Decision 004 — Topic-Specific Delegation
**Decision:** Liquid delegation, when enabled, is topic-specific and instantly revocable/editable.

**Why:** Users should be able to trust someone on one subject without surrendering authority everywhere.

**Historical rule:** Changing delegation changes future authority. It does not rewrite ballots already cast.

**Principle:** Permanent historical decisions, impermanent political authority.

## Decision 005 — Competence + Democracy
**Decision:** Preserve democratic sovereignty while allowing expert/delegate participation for specialized questions.

**Why:** Complex policy can require expertise. However, expertise verification must itself be tested; credentials alone are not assumed to equal competence.

## Decision 006 — Deliberation Is Optional
**Decision:** Deliberation should be available for complex questions but not forced into every decision.

**Possible record:** question, participants, evidence, arguments, consensus points, unresolved disagreements, proposed solutions, resulting decision.

## Decision 007 — Prediction Data Is Research, Not Vote Weight
**Decision:** Private or optional pre-vote forecasts may eventually be collected and compared with outcomes, but prediction accuracy should not initially determine voting power.

**Why:** Forecasting may reveal useful competence signals, but using it as political weight too early could create perverse incentives and requires evidence.

## Decision 008 — No Social-Media Scraping
**Decision:** Do not scrape social media to construct competence or prediction profiles.

## Decision 009 — Vote Secrecy Is Absolute
**Decision:** Never sacrifice vote secrecy for analytics or auditability.

**Why:** Loss of trust in vote secrecy can destroy the legitimacy of the entire platform.

## Decision 010 — Identity / Ballot Separation
**Decision:** Keep identity eligibility separate from ballot contents.

**Why:** The system needs one-person-one-vote/eligibility while preserving political privacy.

## Decision 011 — Raw Ballots Must Survive
**Decision:** Preserve raw ballots and separate tally logic.

**Why:** Future counting methods can change without destroying the underlying democratic record.

## Decision 012 — Blockchain Is a Layer, Not the Whole Security Model
**Decision:** Use blockchain as a governance ledger while pursuing end-to-end verifiability, privacy, coercion resistance, independent review, and adversarial testing.

**Why:** A blockchain can faithfully preserve a vote that was already corrupted before submission.

## Decision 013 — Local Experimentation
**Decision:** Start at manageable organizational/community scales, learn from real use, then expand.

**Why:** Small-scale failure should not endanger an entire national system. Successful mechanisms can spread by demonstrated performance.

## Decision 014 — AI Is a Future Governance Component
**Decision:** AI may eventually assist with evidence curation, deliberation, forecasting, administration, delegation, and possibly constitutional execution.

**Constraint:** AI authority must remain voluntarily delegated and revocable. Humans remain the source of political legitimacy.

## Research Threads To Keep Open
### Swiss direct democracy
The manuscript treats Switzerland as the major real-world inspiration for citizen initiatives, referendums, decentralized government, and continuous democratic correction.

### vTaiwan / g0v
The manuscript uses Taiwan as an example of technologically assisted collaborative governance and deliberation.

### Liquid democracy
Prior research discussed mixed experimental evidence: early experiments found delegation could underperform expectations, while later work suggests bounded/realistic delegation structures can work better. Do not oversell the evidence.

### Deliberative democracy
Modern OECD work supports deliberative processes for complex/value/long-term questions when they are well designed. This is evidence for an optional capability, not proof that deliberation should govern everything.

### AI deliberation
Research has shown promising results for AI-assisted group deliberation/common-ground finding. This supports experimentation, not an assumption that AI is a truth oracle.

### Institutional design
Relevant traditions include:
- Socrates / Plato / Aristotle
- Roman republicanism
- Madison and checks and balances
- Montesquieu
- Mill
- Tocqueville
- Hayek and the knowledge problem
- Ostrom and self-governance
- public choice
- social choice
- behavioral economics
- deliberative democracy
- sortition
- liquid democracy
- Swiss semi-direct democracy
- Taiwan/vTaiwan
- Estonia's digital-state architecture
- prediction markets
- AI governance

## Evidence Discipline
The book contains historical claims, political arguments, examples, quotations, and some claims that were written as advocacy rather than peer-reviewed conclusions. When turning those claims into technical requirements, distinguish:
1. established fact
2. research evidence
3. design choice
4. hypothesis
5. personal political argument

Do not silently convert one category into another.
