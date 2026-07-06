# AGENTS.md

## Cursor Cloud specific instructions

This repo is a full-stack dApp ("SuperDemocracy" — on-chain governance/petitions/referendums) with two projects:

- `blockchain-voting/` — Foundry/Solidity smart contracts (`IdentityMock`, `Organization`, `GroupRegistry`, `Referendum`). See `blockchain-voting/README.md` for standard `forge` commands.
- `superdemocracy/` — Next.js 16 + React 19 frontend using wagmi/viem. See `superdemocracy/README.md` and `package.json` scripts.

The update script already installs the Foundry toolchain, initializes the contract git submodules, and runs `npm install`. Notes below are the non-obvious things it does NOT do.

### Toolchain / PATH
- Foundry binaries (`forge`, `anvil`, `cast`, `chisel`) live in `~/.foundry/bin`. The installer appends this to `~/.bashrc`, so interactive shells have it. For non-interactive shells run: `export PATH="$HOME/.foundry/bin:$PATH"`.

### Running the stack (must be done manually; not part of the update script)
The frontend expects a local Anvil chain and deployed contract addresses.

1. Start Anvil on the exact chain id/port the frontend hardcodes in `superdemocracy/lib/web3.ts` (`chainId 31338`, `http://127.0.0.1:8546`):
   `anvil --chain-id 31338 --port 8546`
2. Deploy the three contracts and verify the deployer. `blockchain-voting/deploy.sh` documents the flow, but has two gotchas — prefer deploying manually:
   - It writes the frontend env file to `~/superdemocracy/.env.local`, NOT `/workspace/superdemocracy/.env.local` (where the app actually reads it).
   - It starts its own Anvil with `--load-state`/`--dump-state` pointed at the git-tracked `blockchain-voting/anvil-state.json` (clobbers a tracked file) and calls `pkill anvil`.
   Deploy sequence: deploy `IdentityMock` (no args), `Organization(identity, 0)`, `GroupRegistry(identity)`, then `cast send <identity> "setVerified(address,bool)" <deployer> true`.
3. Write `/workspace/superdemocracy/.env.local` with:
   `NEXT_PUBLIC_ORG_ADDRESS`, `NEXT_PUBLIC_IDENTITY_ADDRESS`, `NEXT_PUBLIC_GROUP_REGISTRY`.
   On a fresh Anvil these are deterministic: Identity `0x5fbdb2315678afecb367f032d93f642f64180aa3`, Organization `0xe7f1725e7734ce288f8367e1bb143e90bb3f0512`, GroupRegistry `0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0`.
   Admin/deployer = Anvil account 0 (`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`, key `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`); it is auto member+admin (constructor) and gets identity-verified by the `setVerified` call.
4. Run the frontend: `npm run dev` in `superdemocracy/` (serves on `http://localhost:3000`, reads `.env.local`).

### Testing gotchas
- The frontend uses wagmi's `injected()` connector and has no in-app "Connect Wallet" button, so UI write flows (create/sign petition, create/join org) need a browser wallet extension that isn't available in the cloud browser. To exercise core governance functionality end-to-end, call the `Organization` contract directly with `cast` (e.g. `createPetition`, `signPetition`, `approvePetition`, `launchReferendum`).
- The home page "All" petitions list renders from an `events` React state that the app never populates, so newly created petitions do not show as cards on the home page even though `totalPetitions()` counts them (pre-existing).

### Known pre-existing issues (not environment problems)
- `forge fmt --check` reports formatting deviations in the repo's own contracts (build/test still pass).
- `npm run lint` reports pre-existing errors, and `npm run build` fails on a pre-existing TypeScript error in `superdemocracy/app/groups/page.tsx`. Use `npm run dev` for local development.
