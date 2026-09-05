# Master plan

**Author / Founder:** Dustin Murray  
**Purpose:** Single source of truth for the Superdemocracy vision, governance philosophy, product architecture, security direction, research, engineering rules, and roadmap.

---

## 1. THE NORTH STAR

Superdemocracy is a Government-as-a-Platform system for better collective decision-making. It uses technology to make democratic participation easier, more direct, more informed, more accountable, and capable of learning from results.

The objective is not perfect government. The objective is a governance system that can **test, measure, improve, and evolve**.

**People remain sovereign. Technology improves the machinery.**

The platform should let organizations choose the governance capabilities that fit their needs rather than forcing every organization into one constitution.

---

## 2. THE FOUNDING IDEA

The book begins with a frustration: modern representative democracy often forces citizens to wait through long election cycles, choose among parties rather than individual policies, and rely on representatives to interpret public preferences. The proposed answer is technologically enhanced semi-direct democracy: citizens retain authority over important decisions while elected officials remain part of the system.

The book's central invitation is to stop assuming that democracy has reached its final form. Democracy is a human institution and can evolve with technology and society.

The reordered manuscript draws inspiration from Switzerland, Taiwan/vTaiwan, Estonia, liquid democracy, ranked choice, direct democracy, digital identity, blockchain, Government-as-a-Platform thinking, experimentation, and eventually AI.

The book is the **founding vision and intellectual history**. Later engineering decisions may refine or replace individual implementation ideas without erasing the underlying philosophy.

---

## 3. GOVERNMENT AS A PLATFORM

Superdemocracy provides a set of governance capabilities. An organization can enable or disable features.

Examples include:
- petitions
- referendums
- direct voting
- ranked choice
- education/information layers
- deliberation
- expert participation
- topic-specific delegation
- forecasting
- outcome measurement
- AI assistance

The platform should be simple for ordinary users while keeping advanced governance machinery available underneath.

---

## 4. THE SOFT-DEFAULT DECISION PROCESS

### A. Problem
A problem, proposal, or question emerges.

### B. Choose the Process
- simple / low complexity → referendum
- complex → optional deliberation
- specialized → expert information and/or delegation
- emergency → accelerated process

The organization retains control over which capabilities are enabled.

### C. Information
Make understanding ridiculously easy.

**Level 1 — Quick Debrief**
- What are we deciding?
- Why does it matter?
- What is known?
- What is disputed?
- What is uncertain?
- For/Against questions: PROS vs CONS.
- Multiple options: benefits, costs, risks, tradeoffs.

**Level 2 — Evidence**
- claims
- supporting/opposing evidence
- expert statements
- statistics
- studies
- relevant history

**Level 3 — Source Documents**
- legislation
- government reports
- court decisions
- academic papers
- accredited reference works
- primary sources
- datasets
- original documents

The first page should stay uncluttered. Users who want depth can drill down.

### D. Deliberation
Optional for complex questions. It can eventually include structured records of participants, evidence, arguments, agreements, disagreements, proposed solutions, and the resulting decision.

### E. Forecasting
Optional/private predictions can eventually record what people expect before a decision and compare those expectations with later outcomes. This is research data, not initially a source of voting power.

### F. Decision
Use For/Against when a question is genuinely binary. Use ranked choice or another suitable method when several legitimate alternatives exist.

### G. Delegation
When enabled, citizens can vote themselves or delegate by topic. Delegation must be instantly editable/revocable.

### H. Implementation
The decision is executed by the relevant organization/government.

### I. Measurement
Record outcomes and evaluate whether the policy actually worked.

### J. Feedback / Reversal
Where the organization's rules allow it, decisions can be revisited, corrected, or reversed.

**The larger idea:** government becomes a learning system rather than a machine that makes a decision once every four years and hopes for the best.

---

## 5. INFORMATION AND EVIDENCE

Information is one of the most important parts of the platform. The system should not attempt to declare truth merely because an AI says something is true.

AI can eventually:
- summarize sources
- organize evidence
- surface opposing arguments
- identify uncertainty
- identify expert disagreement
- create short educational material
- trace claims back to sources

But provenance remains visible.

A useful source hierarchy is:
- Tier 1: primary government documents, legislation, court decisions, official statistics, original research, historical primary sources
- Tier 2: peer-reviewed research, accredited reference works, professional organizations
- Tier 3: reputable journalism and expert commentary
- Tier 4: public claims, blogs, social media, and other lower-authority material

AI may process all tiers, but the system should label provenance and uncertainty instead of hiding them.

---

## 6. DELIBERATION

Deliberation is a tool, not a religion. It is most useful where questions are complex, technical, value-laden, or difficult to reduce to a binary choice.

The platform can eventually support structured deliberation, but a full social-discussion platform is not a V1 priority. Existing tools or lightweight records can be used while the voting core is stabilized.

Research traditions include deliberative democracy, citizens' assemblies, vTaiwan/Pol.is, and modern OECD work on deliberative processes.

---

## 7. COMPETENCE + DEMOCRACY

The desired philosophy is **democratic sovereignty combined with meritocratic participation in specialized decision-making**.

Citizens retain ultimate authority. For specialized questions, they may use qualified experts or delegates if the organization enables that feature.

This does not mean assuming that credentials equal competence. The platform should experiment with ways to identify useful expertise and measure whether experts actually improve outcomes.

---

## 8. LIQUID DEMOCRACY

Liquid democracy is a future capability, not the V1 default.

Delegation should be:
- topic-specific
- instantly editable
- instantly revocable
- applicable to future voting authority

A person may trust one delegate on energy, another on healthcare, and vote personally on everything else. A delegate may accumulate substantial voting power if people voluntarily give it to them. Artificial caps should not be imposed merely to prevent concentration; the important control is immediate revocability and transparent rules.

A delegation change must not retroactively rewrite a ballot already cast.

**Permanent historical decisions, impermanent political authority.**

Research to keep in view includes experimental work showing both potential benefits and risks of delegation, including overdelegation and coordination effects. Evidence is still evolving; do not oversell the case.

---

## 9. PREDICTION / FORECASTING

Forecasting may become a useful competence signal and research layer.

A possible future flow:
1. Before voting, optionally ask what outcome the user expects.
2. Keep the prediction private or appropriately separated from the live vote.
3. Record the later outcome.
4. Compare prediction quality over time.
5. Experiment with whether predictive accuracy correlates with useful expertise.

Do not initially weight political votes by prediction accuracy.

Do not scrape social media to create prediction or competence profiles.

---

## 10. SECURITY: THE NON-NEGOTIABLE PART

**Never sacrifice vote secrecy for auditability.**

The target is an end-to-end verifiable, privacy-preserving, coercion-resistant voting system. Blockchain is one component.

The guiding model combines:
- the layered cybersecurity philosophy of online financial systems
- public scrutiny
- cryptographic verification
- independent audits
- adversarial testing
- formal verification
- reproducible deployments

The platform should be designed so that compromising one component does not automatically compromise the election.

### Identity / Ballot Separation
Identity establishes eligibility. The ballot records the political choice. These must not become a public, linkable identity-to-vote record.

Long-term tools may include anonymous credentials, commitments, zero-knowledge proofs, selective disclosure, mixing, threshold cryptography, secure multi-party computation, end-to-end verification, and coercion resistance.

### Security Assurance Program
Before high-stakes use, progressively add:
- threat modeling
- contract audits
- static analysis
- formal verification of critical components
- cryptographic review
- independent software review
- infrastructure review
- intrusion testing
- public bug bounty
- reproducible builds
- incident response/recovery

**Don't trust us. Verify us.**

---

## 11. PRIVACY AND RESEARCH DATA

The future system may benefit from demographic and process data for policy research and AI modeling. But vote secrecy is more important than analytics.

The platform should not expose a public relationship between a person and their vote, including through indirect metadata.

If sensitive data cannot be collected safely, do not collect it.

Future privacy-preserving approaches may include:
- aggregated statistics
- minimum cohort sizes
- anonymized identifiers
- differential privacy
- private/off-chain attributes
- selective disclosure
- secure computation

The goal is to let researchers learn population-level patterns without learning how a specific individual voted.

---

## 12. RULES / DATA / EXPERIENCE ARCHITECTURE

This is a foundational engineering rule.

### Rules Layer — Smart Contracts
The contracts enforce governance law:
- who can vote
- who can create petitions
- membership
- verification
- thresholds
- approval requirements
- referendum timing
- ballot validity
- governance state

### Data Layer — Content & Evidence
External content includes arguments, studies, documents, discussion, expert commentary, and source material.

### Experience Layer — Frontend
The frontend presents feeds, education, evidence, pros/cons, discussion, voting, and visualization.

**Rules must never depend on UI behavior.**

---

## 13. SMART-CONTRACT GUARDRAILS

1. Never mix vote storage with vote counting.
2. Never destroy vote history.
3. Always separate identity from governance.
4. Never compute complex tally logic inside `vote()`.
5. Never make governance depend on UI assumptions.
6. Never allow voting outside explicit referendum state.
7. Emit events for meaningful governance actions.
8. Avoid loops over voters.
9. Preserve storage for future counting methods.
10. Admin powers must never affect votes or tallies.

The current architecture was intentionally designed to preserve ranked ballots and future counting methods.

---

## 14. CURRENT CONTRACT SYSTEM

### IdentityMock.sol
- `setVerified(address,bool)`
- `isVerified(address)`

### Organization.sol
Contains members/admins and petition governance.

Petition state includes title, description, threshold, verifiedCount, approval/rejection state, and referendum launch state.

Required flow:
- only verified members create petitions
- verified members can sign
- signatures count only if verified
- threshold must be met
- admin approval can occur before launch
- launch requires approved, threshold met, not rejected, not already launched
- admins must be members
- pre-approval signatures must be re-verified after approval

### Referendum.sol
Constructor:
`(string title, string description, string[] options, uint256 startTime, uint256 endTime, address identityVerifier)`

Ballots must support ranked choices even if the current UI uses a simpler interface.

---

## 15. FRONTEND / CURRENT ENGINEERING STATE

### Stack
- Next.js 16 + App Router
- React
- wagmi
- viem
- Tailwind
- Solidity / Foundry
- Anvil

### Environment Rules
- contract addresses live in `.env.local`
- never hardcode addresses
- after redeployment, remove `.next` and rebuild/restart

### Current recorded local state
- RPC: `http://127.0.0.1:8546`
- Chain ID: `31338`
- frontend: `localhost:3000`

Verify runtime state before relying on these values.

### Current goal

Ship useful governance for real groups, starting small. Community orgs (off-chain) already exist in this repo. On-chain petition/referendum paths should stay compatible with the contract architecture — do not turn that into a broad rewrite unless asked.

---

## 16. DEPLOYMENT AND DEBUGGING RULES

### Deployment
- deployment uses bytecode + `cast send` through the deployment script
- **never use `forge create`**
- do not redeploy unless evidence shows it is required
- always verify bytecode first

Verification:
`cast code <contract_address> --rpc-url http://127.0.0.1:8546`

After changing addresses:
`rm -rf .next`

### Debugging Order
1. chain ID / Anvil instance
2. contract bytecode
3. contract storage/state
4. ABI mismatch
5. frontend read/write logic
6. frontend caching
7. redeployment last

Avoid loops. Diagnose the root cause before retrying.

---

## 17. ROADMAP

### Phase 1 — Stable Governance Core
- live petition data
- petition feed
- verified membership/signing
- threshold handling
- approval/launch
- referendum UX
- education acknowledgement

### Phase 2 — Evidence / Information Layer
- Quick Debrief
- PROS vs CONS / option comparison
- evidence pages
- source-document references
- provenance

### Phase 3 — Deliberation
- lightweight structured deliberation record
- optional integration with suitable external tools
- later native deliberation if justified

### Phase 4 — Better Voting
- robust ranked-choice ballots
- switchable tally methods
- independently verifiable results

### Phase 5 — Identity / Privacy
- production identity provider
- anonymous credentials
- identity/ballot separation
- end-to-end verification
- coercion resistance
- privacy-preserving research data

### Phase 6 — Liquid Democracy
- separate DelegationRegistry
- topic-specific delegation
- instant revocation/editing
- research-driven competence/reputation experiments

### Phase 7 — Forecasting / Measurement
- optional pre-vote prediction
- outcome measurement
- longitudinal governance research

### Phase 8 — AI Governance Assistance
- evidence curation
- source summarization
- argument mapping
- deliberation assistance
- forecasting assistance
- administrative automation

### Phase 9 — Constitutional Intelligence
Long-term research only. AI may eventually become a powerful delegated executive/administrator operating within human-defined constitutional constraints. Political legitimacy remains human and revocation remains immediate.

---

## 18. LOCAL-FIRST EXPERIMENTATION

The platform should prove itself at smaller scales before being trusted with larger ones. Potential early users include:
- families / small groups
- neighborhoods / community groups
- schools / parent associations
- companies
- unions
- stratas
- political organizations
- municipalities

This follows the book's original idea: build useful governance machinery in places where experimentation is possible, demonstrate results, and let successful mechanisms spread voluntarily.

The aim is not to force one political system on everyone. If the platform works, others can copy or adopt what works.

---

## 19. GOVERNANCE RESEARCH PROGRAM

The project should continuously study the history and science of collective decision-making, including:
- Socrates, Plato, Aristotle
- Roman republicanism
- Madison / constitutional checks
- Montesquieu
- Mill
- Tocqueville
- Hayek
- Ostrom
- public choice
- social choice
- behavioral economics
- deliberative democracy
- sortition
- liquid democracy
- Swiss semi-direct democracy
- Taiwan / vTaiwan
- Estonia
- prediction markets
- AI governance

Research should challenge the project rather than merely confirm it.

---

## 20. DECISION DISCIPLINE

Every major architecture change should answer:
1. **WHAT** are we changing?
2. **WHY** are we changing it?
3. **EVIDENCE** supporting the change?
4. **ASSUMPTIONS** being made?
5. **WHAT WOULD CHANGE OUR MINDS?**

Do not silently turn a hypothesis from the book into a permanent technical requirement.

---

## 21. Document organization

These files live in `docs/plan/` so the project does not scatter across chats.

- [north-star.md](north-star.md) — short vision and non-negotiable principles
- [system-specification.md](system-specification.md) — intended software behavior
- [security-architecture.md](security-architecture.md) — security and privacy
- [research-and-decisions.md](research-and-decisions.md) — evidence and design decisions
- [master-plan.md](master-plan.md) — this file. If you only open one plan document, open this one

More planning documents will be added in this folder over time. The founding book and other source manuscripts are not required in git until they have a clear filename and a reason to be here.

Local Anvil account files must never be committed.

---

## 22. FINAL PRINCIPLES

**People remain sovereign.**

**Government should be able to learn.**

**Make becoming informed ridiculously easy.**

**Use the simplest process that fits the question.**

**Keep specialized participation compatible with democratic sovereignty.**

**Delegation must be topic-specific and instantly revocable.**

**Preserve historical ballots.**

**Never sacrifice vote secrecy for auditability.**

**Rules, Data, and Experience remain separate.**

**Blockchain is a tool, not a religion.**

**AI is an assistant/delegate before it is an executive.**

**Experiment locally. Measure honestly. Copy what works. Discard what fails.**

**Don't trust us. Verify us.**
