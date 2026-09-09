# Contracts

Foundry project for on-chain organizations, membership, petitions, and referendums.

Community orgs, petitions, polls, and votes in the Next.js app do **not** require these contracts.

## Local chain

Anvil for this project runs at `http://127.0.0.1:8546`, chain id **`31338`** (not the Anvil defaults). `lib/web3.ts` and `lib/web3-server.ts` expect exactly that.

```bash
cd contracts
./deploy.sh
```

`deploy.sh` (bash; needs Foundry and `jq`) restarts Anvil, deploys `IdentityMock` → `ReferendumFactory` → `GroupRegistry` with `cast send --create`, pre-verifies the five default Anvil accounts on `IdentityMock`, and writes `NEXT_PUBLIC_IDENTITY_ADDRESS` / `NEXT_PUBLIC_GROUP_REGISTRY` into `../.env.local`. Anvil state persists in `anvil-state.json` (gitignored).

Do not use `forge create` — it repeatedly failed against this setup.

## Debugging order

Chain id → bytecode (`cast code <addr> --rpc-url http://127.0.0.1:8546`) → storage → ABI → frontend. Redeploy last.

## Files

| Contract | Role |
|----------|------|
| `GroupRegistry.sol` | Creates organizations; creator is admin |
| `Organization.sol` | Membership, petitions, approval, referendum launch |
| `ReferendumFactory.sol` / `IReferendumFactory.sol` | Deploys referendums so `Organization` stays small |
| `Referendum.sol` | Ranked ballots, education acknowledgement, first-choice counters |
| `IIdentityVerifier.sol` / `IdentityMock.sol` | Identity is separate from governance; the mock is local-only |
| `Voting.sol` | Legacy toy poll. Kept so nothing breaks; not the direction (see `docs/DECISION-LOG.md`) |
