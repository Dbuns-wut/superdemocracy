#!/bin/bash
set -e

RPC_URL="http://127.0.0.1:8546"
PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
DEPLOYER="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

echo "Killing old Anvil..."
pkill anvil 2>/dev/null || true

echo "Starting Anvil..."

if [ -f anvil-state.json ]; then
  echo "Loading existing state..."
  anvil --chain-id 31338 \
    --port 8546 \
    --load-state anvil-state.json \
    --dump-state anvil-state.json \
    > anvil.log 2>&1 &
else
  echo "No existing state found. Starting fresh..."
  anvil --chain-id 31338 \
    --port 8546 \
    --dump-state anvil-state.json \
    > anvil.log 2>&1 &
fi

sleep 6

echo "Building contracts..."
forge build > /dev/null

########################################
# 1️⃣ Deploy IdentityMock
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

########################################
# 2️⃣ Deploy Organization (with default Open mode)
########################################

echo "Deploying Organization..."

ORG_BYTECODE=$(forge inspect Organization bytecode)

ORG_ARGS=$(cast abi-encode "constructor(address,uint8)" $IDENTITY_ADDRESS 0)
ORG_BYTECODE_WITH_ARGS=$ORG_BYTECODE${ORG_ARGS:2}

ORG_TX=$(cast send \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --create $ORG_BYTECODE_WITH_ARGS \
  --json)

ORG_ADDRESS=$(echo $ORG_TX | jq -r '.contractAddress')

echo "Organization deployed at: $ORG_ADDRESS"

########################################
# 2.5️⃣ Deploy GroupRegistry
########################################

echo "Deploying GroupRegistry..."

REGISTRY_BYTECODE=$(forge inspect GroupRegistry bytecode)

REGISTRY_ARGS=$(cast abi-encode "constructor(address)" $IDENTITY_ADDRESS)
REGISTRY_BYTECODE_WITH_ARGS=$REGISTRY_BYTECODE${REGISTRY_ARGS:2}

REGISTRY_TX=$(cast send \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --create $REGISTRY_BYTECODE_WITH_ARGS \
  --json)

REGISTRY_ADDRESS=$(echo $REGISTRY_TX | jq -r '.contractAddress')

echo "GroupRegistry deployed at: $REGISTRY_ADDRESS"

########################################
# 3️⃣ Bootstrap Deployer
########################################

echo "Verifying deployer..."

cast send $IDENTITY_ADDRESS \
  "setVerified(address,bool)" \
  $DEPLOYER true \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY > /dev/null

echo "Deployer is auto-added as member + admin in constructor."

########################################
# 4️⃣ Update Frontend
########################################

echo "Updating frontend..."

echo "NEXT_PUBLIC_ORG_ADDRESS=$ORG_ADDRESS" > ~/superdemocracy/.env.local
echo "NEXT_PUBLIC_IDENTITY_ADDRESS=$IDENTITY_ADDRESS" >> ~/superdemocracy/.env.local
echo "NEXT_PUBLIC_GROUP_REGISTRY=$REGISTRY_ADDRESS" >> ~/superdemocracy/.env.local

########################################
# 5️⃣ Done
########################################

echo ""
echo "===================================="
echo "Deployment complete."
echo "ORG_ADDRESS: $ORG_ADDRESS"
echo "IDENTITY_ADDRESS: $IDENTITY_ADDRESS"
echo "===================================="

