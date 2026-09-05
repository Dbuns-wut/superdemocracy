import assert from "node:assert/strict"
import { buildSignedActionMessage, serializeActionPayload } from "./signed-action-message"

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log("ok:", name)
  } catch (e) {
    console.error("fail:", name, e)
    process.exitCode = 1
  }
}

test("cast message omits Payload when empty", () => {
  const msg = buildSignedActionMessage({
    action: "votes.cast",
    resourceId: "vote-1",
    voterId: "0x1111111111111111111111111111111111111111",
    choices: [0, 2],
    nonce: "nonce-abcdef",
    issuedAt: 1000,
    expiresAt: 2000,
    origin: "http://localhost:3000/",
  })
  assert.match(msg, /SuperDemocracy Signed Action/)
  assert.match(msg, /Choices: \[0,2\]/)
  assert.equal(msg.includes("Payload:"), false)
  assert.match(msg, /Domain: http:\/\/localhost:3000/)
})

test("create message includes Payload", () => {
  const payload = { title: "Test", options: ["A", "B"] }
  const msg = buildSignedActionMessage({
    action: "votes.create",
    resourceId: "org-1",
    voterId: "0x1111111111111111111111111111111111111111",
    choices: [],
    payload,
    nonce: "nonce-xyz12345",
    issuedAt: 1000,
    expiresAt: 2000,
    origin: "http://localhost:3000",
  })
  assert.match(msg, /Payload: /)
  assert.ok(msg.includes(serializeActionPayload(payload)))
})

test("ballot crypto roundtrip", async () => {
  const { encryptBallotChoices, decryptBallotChoices } = await import("./ballot-crypto")
  const enc = encryptBallotChoices([1, 3])
  const dec = decryptBallotChoices(enc)
  assert.deepEqual(dec, [1, 3])
})
