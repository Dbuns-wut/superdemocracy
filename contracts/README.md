# Contracts

Foundry project for on-chain organizations, membership, and referendums.

Community orgs, petitions, polls, and votes in the Next.js app do **not** require these contracts.

```bash
cd contracts
forge build
```

The app’s Anvil connector in `lib/web3.ts` expects RPC at `http://127.0.0.1:8546` (chain id `31338`).
