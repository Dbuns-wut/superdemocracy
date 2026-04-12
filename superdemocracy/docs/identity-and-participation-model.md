# Identity & Participation Model

## Core Principle

Participation is allowed before identity verification.
Only verified actions have governance impact.

---

## Rules

### 1. Signing Petitions

* Unverified users CAN sign petitions
* Signatures are stored on-chain
* Only verified signatures count toward thresholds

### 2. Membership

* Users can join or request to join without verification
* Org admins approve membership
* Membership does NOT grant global verification

### 3. Identity

* Only the Identity contract controls verification
* Organizations must NEVER modify verification state

### 4. Revalidation

* Signatures collected before verification must be revalidated
* Final counts must only include verified participants

---

## Layer Separation

### Identity Layer (Global)

* Verified / not verified
* Future: government ID, ZK identity

### Organization Layer (Local)

* Membership
* Admin approval
* Optional verification requirements

### Governance Layer

* Petition creation (verified only)
* Voting (verified only)

---

## UX Goals

* Users can sign up instantly
* No upfront identity friction
* Identity builds over time
* Organizations handle their own onboarding requirements

---

## Security Principles

* No verification laundering (orgs cannot grant global verification)
* Identity remains fully separate from governance logic
* All critical actions require verification

---

## Future Enhancements

* Org-level verification requirements
* Reputation system
* Multiple identity providers
* Delegation system

