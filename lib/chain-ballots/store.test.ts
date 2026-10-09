import assert from "node:assert/strict"
import { randomUUID } from "crypto"
import { promises as fs } from "fs"
import { addSecretChainBallot, secretChainTally } from "./store"

async function main() {
  const referendum = "0x0000000000000000000000000000000000000abc"
  const voter = "0x1111111111111111111111111111111111111111"
  const saved = await addSecretChainBallot({
    referendum,
    signature: `sig-${voter}-${randomUUID()}`,
    choices: [1],
  })
  assert.equal(saved.ok, true)
  const counts = await secretChainTally(referendum, 2)
  assert.equal(counts.length, 2)
  assert.equal(counts[1] >= 1, true)
  assert.equal("voterId" in counts, false)
  const raw = await fs.readFile("data/chain-secret-ballots.json", "utf8")
  assert.equal(raw.toLowerCase().includes(voter.toLowerCase()), false)
  assert.equal(raw.includes("[1]"), false)
  console.log("ok: secret tally stores no voter address and no plaintext choice")
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
