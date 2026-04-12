# Architecture Rules — Superdemocracy

## Core Principle

This system must support future governance models without requiring contract rewrites.

All design decisions must preserve forward compatibility.

---

## Layer Separation (MANDATORY)

### 1. Rules Layer (Smart Contracts)

Defines:

* who can vote
* who can join
* petition thresholds
* approval logic
* referendum rules

Rules must NEVER depend on frontend behavior.

---

### 2. Data Layer (Off-chain / IPFS)

Stores:

* application data
* discussions
* arguments
* evidence

Contracts should only store references (e.g. hashes, URIs).

---

### 3. Experience Layer (Frontend)

Handles:

* UI/UX
* display logic
* user flows

Frontend must NEVER enforce rules.

---

## Identity Separation (CRITICAL)

* Identity must remain completely separate from governance
* Only the Identity contract can set verification status
* Organizations must NEVER modify global identity

### Rule:

No contract except Identity may call:
setVerified(address, bool)

---

## Participation Model

* Users may participate before being verified
* Unverified actions are stored but do not count toward governance outcomes
* Verified status determines impact, not participation

---

## Voting Architecture

### 1. Store Raw Ballots

Always store:

mapping(address => uint256[]) public ballots;

Never store only computed results.

---

### 2. Separate Counting

Use:

mapping(uint256 => uint256) public optionVotes;

Do NOT embed complex logic inside vote()

---

### 3. Never Destroy Vote History

Bad:
delete ballots[msg.sender];

Good:
ballots[msg.sender] = newVote;

---

## Petition System Rules

* Only verified members can create petitions
* Anyone (verified or not) may sign petitions (future behavior)
* Only verified signatures count toward thresholds
* Signatures must be revalidated before referendum launch

---

## Membership Rules

* Users can join or request to join without verification
* Organization approval grants membership ONLY
* Membership does NOT imply identity verification

---

## Admin Powers

Admins may:

* approve or reject petitions
* approve members
* launch referendums

Admins must NEVER:

* modify votes
* modify vote counts
* modify identity status

---

## Gas & Scalability Rules

* Never loop over all users
* Never iterate over voter lists on-chain
* Use mappings for O(1) access
* Perform heavy computation off-chain if needed

---

## Contract Interaction Rules

* Always verify contract bytecode before interacting
* Do not redeploy unless absolutely necessary
* ABI must match deployed contract
* Never hardcode contract addresses in frontend

---

## Frontend Rules

* Always read directly from contract
* Do not cache critical governance state incorrectly
* Use checksum addresses consistently
* Never infer contract state in UI

---

## Future Compatibility Requirements

The system must support:

* ranked choice voting
* multiple vote counting methods
* liquid delegation
* multiple concurrent petitions
* identity upgrades (government ID, ZK, etc.)

---

## Critical Invariants (DO NOT BREAK)

1. Identity is separate from governance
2. Participation is allowed before verification
3. Only verified actions affect outcomes
4. Contracts must remain upgrade-compatible
5. No loops over dynamic user sets
6. UI must not define rules

---

## Guiding Philosophy

Anyone can participate.

Only trusted input determines outcomes.

This system is designed to scale from:

* small private groups
  to
* large public governance systems

without changing core contracts.

