# Plan: Invisible / Embedded Wallets ("users don't know they have a wallet")

> Status: Planning only (no implementation yet). App is on hold pending Quoter launch.
>
> Goal: When a user makes an account, a crypto wallet is silently created and attached
> to that account and used for blockchain voting — with no seed phrases, no MetaMask,
> and no "crypto" language in the UX.

## Feasibility

**Yes — this is a mainstream, well-supported pattern** ("embedded wallets" /
"wallet-as-a-service"). You do not build key custody yourself. A provider silently
creates a non-custodial wallet the moment someone signs up with email / Google /
passkey. No seed phrase, no wallet extension, no popups.

## The one core decision: where does signing happen?

1. **Client-side embedded wallet (recommended default).**
   Provider (e.g. Privy) creates an MPC wallet bound to the account; the signing key is
   split between the user's device and the provider, so neither alone can sign. Votes are
   signed silently in the browser — no popup. Non-custodial, best UX, fastest to ship.

2. **Backend / server-side signing (the "in the backend" phrasing).**
   Use Turnkey (keys in secure enclaves + a policy engine). Your server signs vote
   transactions on the user's behalf. Fully custodial; needs strict policy/authz. Enables
   "cast this vote from the server" and AI-agent-style automation.

**Recommendation:** start with **#1**; only move signing server-side if you specifically
want the backend to transact for users.

## Recommended stack

- **Auth + wallet: Privy** (Dynamic is a close alternative).
  One SDK gives you the *account system the app does not currently have*
  (email / social / passkey login) **and** an embedded wallet created silently right after
  signup. This directly matches "make an account → wallet attached to it." Choose Dynamic
  instead if you later want to also let crypto-native users link an existing MetaMask.
- **Gasless: ERC-4337 smart account + a paymaster** (Pimlico / Alchemy / Biconomy,
  standardized via ERC-7677) so users never need to hold ETH for gas.
  On the local Anvil chain gas is free, so this only matters on a real testnet/mainnet —
  but model the wallet as a smart account from day one so gas sponsorship is a config
  change, not a rewrite.
- **Optional app DB (Supabase is available):** mirror the `account → wallet address`
  mapping and profile data. Privy already stores this, so only add it if you want your own
  source of truth.

### Provider landscape (2026, for reference)

| Provider | Custody model | Auth | Best for |
| --- | --- | --- | --- |
| **Privy** | 2/2 MPC + passkey (non-custodial) | email, social, SMS, passkey | React/Next.js consumer apps (default pick) |
| Dynamic | MPC + injected hybrid | email, social, SIWE | polished onboarding, also link external wallets |
| Web3Auth | 2/3 MPC | social OAuth, email, passkey | broad / non-EVM chain support |
| Turnkey | TEE enclaves + policy engine | API keys, passkeys | policy-driven backend / server-side signing |

## How it maps onto the current code (small, contained frontend change)

- `superdemocracy/lib/web3.ts` currently uses wagmi's `injected()` connector. Replace that
  with the Privy provider wrapping the existing `WagmiProvider` config; keep the same
  `anvil` chain (id `31338`). **This is the core swap.**
- Remove the "Connect Wallet" buttons — after login `useAccount()` returns the embedded
  wallet address, so `useRoles`, `PetitionCard`, and the referendum page keep working
  unchanged.
- **Contracts need almost nothing changed.** They gate on `msg.sender` being a member and
  `identityVerifier.isVerified(msg.sender)`. The embedded wallet is just a normal address,
  so the existing `join()` / `createPetition()` / `signPetition()` / `vote()` flows work
  as-is.

## The one governance wrinkle to design for: identity verification

`superdemocracy/docs/architecture-rules.md` keeps identity separate from governance, and
actions require `IdentityMock.isVerified(address)`. A brand-new embedded wallet starts
unverified. Decide **who calls `setVerified(newWallet, true)`** (today it's the deployer):

- a backend admin key verifies wallets after an email/KYC check, **or**
- (per the existing rules) let unverified users *participate* while only verified actions
  *count* toward outcomes.

This is a policy choice, not a technical blocker — but it is the piece to nail down,
because the invisible-wallet UX is only as good as the "how does a new account become
allowed to vote" flow behind it.

## Suggested phasing

1. **Auth + embedded wallet** — integrate Privy, drop `injected()`, remove connect
   buttons. Users sign up and silently get a wallet. (Frontend + provider config only.)
2. **Verification / membership bridge** — backend endpoint (admin key) that verifies and
   adds new wallets as members, triggered on signup or approval.
3. **Gasless** — convert to ERC-4337 smart accounts + paymaster with per-user sponsorship
   caps and rate limits (needed only once you leave local Anvil).
4. **Optional** — server-side signing via Turnkey if votes should be cast from the backend;
   plus an "export to self-custody" path for power users.

## Effort / risk (technical, not calendar)

- **Phase 1** is small and low-risk — mostly the `web3.ts` provider swap plus removing
  connect UI; contracts untouched.
- **Phase 2** introduces the first backend service and an admin signing key (secret
  management matters).
- **Phase 3** is the most involved — smart-account migration, and the paymaster contract
  must be staked/funded and abuse-protected (charge gas during validation, enforce
  off-chain rate limits, monitor deposits).
- Main dependencies/risks: reliance on the wallet provider for recovery/signing, and the
  custody/regulatory posture if you go server-side custodial.

## References

- Embedded wallet provider comparisons (Privy / Dynamic / Web3Auth / Turnkey), 2026.
- ERC-4337 paymaster docs and gasless-UX production checklists (ERC-7677 standard;
  pre-charge during validation; staking + deposit monitoring; off-chain rate limiting).
