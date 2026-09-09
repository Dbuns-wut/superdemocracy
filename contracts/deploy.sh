#!/bin/bash
# Local dev deploy: restart Anvil (chain 31338, port 8546), deploy IdentityMock,
# ReferendumFactory and GroupRegistry with `cast send --create`, then write the
# addresses into ../.env.local for the Next.js app.
#
# Run from the contracts/ folder in a shell that has Foundry (anvil, forge, cast) and jq.
# `forge create` is deliberately not used — it repeatedly failed against this setup.
#
# The private key below is Anvil's well-known default account 0. It is public test
# material for a local node only. Never put a real key in this file.
set -e

cd "$(dirname "$0")"

RPC_URL="http://127.0.0.1:8546"
CHAIN_ID=31338
PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
ENV_FILE="../.env.local"

echo "Killing old Anvil..."
pkill anvil 2>/dev/null || true

echo "Starting Anvil..."
if [ -f anvil-state.json ]; then
  echo "Loading existing state..."
  anvil --chain-id $CHAIN_ID \
    --port 8546 \
    --load-state anvil-state.json \
    --dump-state anvil-state.json \
    > anvil.log 2>&1 &
else
  echo "No existing state found. Starting fresh..."
  anvil --chain-id $CHAIN_ID \
    --port 8546 \
    --dump-state anvil-state.json \
    > anvil.log 2>&1 &
fi

sleep 6

echo "Building contracts..."
forge build > /dev/null

########################################
# 1. IdentityMock
########################################

echo "Deploying IdentityMock..."
IDENTITY_BYTECODE=$(forge inspect IdentityMock bytecode)
IDENTITY_TX=$(cast send \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --create $IDENTITY_BYTECODE \
  --json)
IDENTITY_ADDRESS=$(echo $IDENTITY_TX | jq -r '.contractAddress')
echo "IdentityMock deployed at: $IDENTITY_ADDRESS"

# Org admins must pass isVerified(msg.sender), otherwise approveMember reverts NotVerified().
# IdentityMock.setVerified is open to anyone; this is a local mock, not production identity.
DEV_VERIFIED=(
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906"
  "0x15d34AAf54267DB7D7c367839AAf71a00a2C6A65"
)

echo "Verifying default Anvil dev accounts on IdentityMock (local dev only)..."
for addr in "${DEV_VERIFIED[@]}"; do
  cast send "$IDENTITY_ADDRESS" \
    "setVerified(address,bool)" \
    "$addr" true \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    > /dev/null
done

########################################
# 2. ReferendumFactory
#    (keeps GroupRegistry small — Organization no longer embeds Referendum bytecode)
########################################

echo "Deploying ReferendumFactory..."
REF_FACTORY_BYTECODE=$(forge inspect ReferendumFactory bytecode)
REF_FACTORY_TX=$(cast send \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --create $REF_FACTORY_BYTECODE \
  --json)
REF_FACTORY_ADDRESS=$(echo $REF_FACTORY_TX | jq -r '.contractAddress')
echo "ReferendumFactory deployed at: $REF_FACTORY_ADDRESS"

########################################
# 3. GroupRegistry
########################################

echo "Deploying GroupRegistry..."
REGISTRY_BYTECODE=$(forge inspect GroupRegistry bytecode)
REGISTRY_ARGS=$(cast abi-encode "constructor(address)" $REF_FACTORY_ADDRESS)
REGISTRY_BYTECODE_WITH_ARGS=$REGISTRY_BYTECODE${REGISTRY_ARGS:2}
REGISTRY_TX=$(cast send \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --create $REGISTRY_BYTECODE_WITH_ARGS \
  --json)
REGISTRY_ADDRESS=$(echo $REGISTRY_TX | jq -r '.contractAddress')
echo "GroupRegistry deployed at: $REGISTRY_ADDRESS"

########################################
# 4. Frontend env
########################################

echo "Updating $ENV_FILE ..."
# Preserve any other keys (DATABASE_URL, BALLOT_ENCRYPTION_KEY, ...) already in .env.local.
touch "$ENV_FILE"
grep -v -E '^(NEXT_PUBLIC_IDENTITY_ADDRESS|NEXT_PUBLIC_GROUP_REGISTRY)=' "$ENV_FILE" > "$ENV_FILE.tmp" || true
echo "NEXT_PUBLIC_IDENTITY_ADDRESS=$IDENTITY_ADDRESS" >> "$ENV_FILE.tmp"
echo "NEXT_PUBLIC_GROUP_REGISTRY=$REGISTRY_ADDRESS" >> "$ENV_FILE.tmp"
mv "$ENV_FILE.tmp" "$ENV_FILE"

echo ""
echo "===================================="
echo "Deployment complete."
echo "IDENTITY_ADDRESS:   $IDENTITY_ADDRESS"
echo "GROUP_REGISTRY:     $REGISTRY_ADDRESS"
echo "REFERENDUM_FACTORY: $REF_FACTORY_ADDRESS"
echo "Orgs are created via GroupRegistry.createGroup — the creator is admin."
echo "Default Anvil accounts 0-4 are pre-verified on IdentityMock."
echo "Other wallets: IdentityMock.verifySelf() once (org page button) or setVerified."
echo "===================================="
