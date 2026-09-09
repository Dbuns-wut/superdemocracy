# SUPERDEMOCRACY GOVERNANCE MEASUREMENT

**Status:** Canonical design specification  
**Version:** 0.1  
**Date:** 2026-09-08  
**Chief Architect:** Dustin Murray

---

## Purpose

Superdemocracy is intended to improve the experience and performance of collective decision-making, not merely increase the number of votes cast.

The platform should therefore preserve useful behavioral data and collect lightweight feedback that helps answer a practical question:

**Are people becoming more satisfied with how their organization makes decisions, while feeling heard, informed, and able to trust the process even when they do not get the result they wanted?**

The founding manuscript explicitly identifies increased participation and voter satisfaction as evidence that the system is working, while also aiming to reduce tribalism and polarization, broaden public involvement, and make nuanced discussion normal.

This document defines the measurement framework beneath those goals.

---

# 1. THE NORTH STAR

Superdemocracy should seek broad, durable improvement in:

- satisfaction with organizational decision-making;
- trust in the decision process;
- the feeling that citizens had a meaningful voice;
- acceptance of legitimate outcomes, including among people whose preferred option lost;
- access to useful, balanced information;
- reduced tribalism and polarization;
- productive, nuanced participation.

The platform should track both **mean and median** satisfaction and preserve the distribution around them.

The goal is not to maximize the happiness of the winning side while creating an equally angry losing side. Broad satisfaction and legitimacy matter.

There should be no single opaque "democracy score."

---

# 2. CORE FEEDBACK DIMENSIONS

These are persistent dimensions the platform should be capable of measuring over time. They do not all need to be asked after every vote.

## A. Overall Governance Satisfaction

Periodic question:

> Overall, how satisfied are you with how this organization makes decisions?

This is a longitudinal measure of the citizen or member experience with the organization as a whole.

## B. Process Satisfaction

Example:

> Regardless of whether you got the result you wanted, how satisfied are you with how this decision was made?

This separates satisfaction with the democratic process from satisfaction with the outcome.

## C. Result Satisfaction

Example:

> How satisfied are you with the result of this decision?

This records the lived reaction to the outcome itself.

## D. Preferred Outcome

Example:

> Did the result match what you wanted?

This allows process and result satisfaction to be compared between people whose preferred option won and those whose preferred option lost.

## E. Loser Acceptance and Loser Satisfaction

A healthy process must be able to produce legitimate disagreement.

Useful questions include:

> If your preferred option did not win, are you still satisfied with how the decision was reached?

> Do you accept the result as a legitimate outcome of the process?

The experience of losing participants is especially useful for detecting winner-versus-loser resentment and testing whether a process is reducing tribalism.

## F. Voice and Representation

Example:

> Do you feel you had a meaningful opportunity to influence this decision?

The platform exists in part to reduce the feeling that citizens disappear inside large political bundles or are heard only at election time.

## G. Trust

Example:

> How much do you trust decisions made through this process, even when you disagree with the outcome?

Trust should be tracked separately from simple approval of the winning option.

## H. Information Quality

Useful rotating questions include:

> Were you satisfied with the information provided?

> Did the information fairly represent the major sides or options?

> Did you have enough information to make your decision?

## I. Perceived Information Bias

Example:

> Did the information provided feel politically or ideologically biased?

This is particularly important because the Education Before Vote layer is a core Superdemocracy feature.

The goal is not to claim that a low bias score proves objective neutrality. The goal is to detect patterns, complaints, and design failures that require investigation.

---

# 3. BEHAVIORAL DATA

Where privacy permits, Superdemocracy should preserve non-survey measures such as:

- number of eligible participants;
- turnout;
- abstention;
- petition participation;
- Education Before Vote gate completion;
- direct voting versus delegation;
- delegation changes and revocations;
- vote changes before a ballot closes, where the voting method permits them;
- distribution of choices;
- participation frequency over time;
- use of deliberation or other optional governance features.

These measures are valuable evidence, but **they are not automatically measures of success**.

High turnout can indicate strong engagement, but it can also indicate fear, anger, or crisis.

Low turnout can indicate apathy, but it can also mean the decision is low-stakes, people are broadly satisfied, or participants have deliberately delegated the issue.

Participation must therefore be interpreted in context.

---

# 4. DISTRIBUTIONS MATTER MORE THAN A SINGLE AVERAGE

Superdemocracy should preserve enough aggregate information to understand the shape of feedback, including where appropriate:

- mean;
- median;
- quartiles or similar distribution summaries;
- extreme satisfaction and dissatisfaction;
- winner versus loser satisfaction;
- process satisfaction versus result satisfaction;
- changes over time;
- differences between governance methods or decision types.

A process in which winners report 10/10 satisfaction and losers report 1/10 may be less healthy than a process in which winners report 8/10 and losers report 6/10, even if both produce a valid decision.

The system should therefore look for broad legitimacy rather than only majority happiness.

---

# 5. THE GOVERNANCE FEEDBACK ENGINE

Feedback should be useful without becoming annoying.

The preferred model is a lightweight, game-like feedback system similar to the short questions commonly shown after a completed interaction.

After a vote, a participant might receive one simple question rather than a long permanent survey.

Examples:

> How satisfied were you with this decision process?

> Were you happy with the information provided?

> Did the information seem biased?

> Did you feel heard?

> Did you get the result you wanted?

Questions can rotate so that useful longitudinal data accumulates without repeatedly asking every participant everything.

Occasional deeper surveys may be used when a particular experiment requires them.

Survey fatigue is itself a design failure to monitor.

---

# 6. MEASURE THE UNCERTAINTY

Superdemocracy is an experimental governance platform.

When the project is uncertain about a feature, it should identify the actual uncertainty and collect the smallest useful set of feedback needed to test it.

Examples:

### Binary Referendums and Tribalism

Question:

Does a one-versus-one referendum produce more winner/loser polarization than a multi-option or ranked decision?

Useful measurements could include:

- preferred option;
- process satisfaction;
- result satisfaction;
- loser satisfaction;
- acceptance of the result;
- whether participants felt adequate alternatives were available.

### Education Before Vote

Question:

Does the information layer improve confidence and trust without creating a perception that the platform is steering voters?

Useful measurements could include:

- information satisfaction;
- perceived balance;
- perceived bias;
- confidence in understanding the question;
- trust in the process.

### Expert-Qualified Delegation

Question:

Does expert-qualified delegation increase confidence in delegated decision-making while protecting against popularity-driven demagoguery?

Useful measurements could include:

- trust in the delegate process;
- satisfaction with delegate choices;
- revocation behavior;
- perceived competence of available delegates;
- satisfaction among direct voters and delegators.

### Deliberation

Question:

Does deliberation increase understanding, compromise, or acceptance among people who ultimately lose the vote?

Useful measurements should be chosen specifically for that question.

The project should not collect data merely because it is possible to collect it.

---

# 7. POLICY IMPLEMENTATION METRICS ARE A SEPARATE LAYER

A democratic vote is often a contest between different desired directions. There is not always one predetermined objective against which the vote itself can be judged.

For that reason, Superdemocracy should separate:

1. **Democratic process health** — satisfaction, trust, voice, information quality, polarization, acceptance, participation; from
2. **Policy implementation results** — whether a particular chosen policy later achieved the goals defined for it.

When a decision has measurable implementation goals, the organization may define those goals and use Superdemocracy to record or compare later outcomes.

Those metrics are case-specific.

Superdemocracy should not invent universal policy-success metrics for organizations.

---

# 8. PRIVACY

Measurement shall not undermine vote secrecy.

For secret ballots, feedback and analytics should be designed so that useful aggregate learning does not create a recoverable identity-to-vote record.

If a desired metric cannot be collected safely, the metric should be reduced, aggregated, redesigned, or omitted.

The priority remains:

**Never sacrifice vote secrecy for analytics.**

---

# 9. IMPLEMENTATION PRINCIPLE

The platform should retain raw, privacy-safe evidence whenever practical and avoid locking governance research to one interpretation.

A future researcher or contributor may discover that a metric thought unimportant today becomes useful later.

At the same time, Superdemocracy should resist collecting sensitive or unnecessary personal data "just in case."

The measurement system should be capable of evolving as the platform learns.

---

# 10. SUCCESS CONDITION

Superdemocracy should be able to answer questions such as:

- Are people more satisfied with how decisions are made?
- Do people trust the process when they lose?
- Do citizens feel that their voice matters?
- Is information perceived as useful and balanced?
- Are different voting methods producing different satisfaction distributions?
- Are we reducing winner-versus-loser resentment?
- Are we reducing tribal political behavior?
- Are people participating when they care without being overwhelmed by unnecessary votes?
- Are new governance features actually improving the experience?

That is the purpose of measurement.

The platform is not merely a voting machine.

It is intended to become a governance system capable of learning from the people who use it.
