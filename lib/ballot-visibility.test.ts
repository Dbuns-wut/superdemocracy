import assert from "node:assert/strict"
import { openSealedBallot, sealBallotChoices } from "./ballot-crypto"
import { canReadLinkedBallot } from "./ballot-visibility"

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log("ok:", name)
  } catch (e) {
    console.error("fail:", name, e)
    process.exitCode = 1
  }
}

test("sealed ballot does not contain the plaintext choice", () => {
  const choices = [1, 0, 2]
  const sealed = sealBallotChoices(choices)
  assert.equal(sealed.startsWith("0x"), true)
  assert.equal(sealed.includes("010002"), false)
  const asText = Buffer.from(sealed.slice(2), "hex").toString("utf8")
  assert.equal(asText.includes("[1,0,2]"), false)
  assert.equal(asText.includes('"choices"'), false)
  assert.deepEqual(openSealedBallot(sealed), choices)
})

test("public callers cannot read a linked ballot", () => {
  const result = canReadLinkedBallot({
    auditorVisible: true,
    callerIsAppointedCounter: false,
  })
  assert.equal(result.ok, false)
})

test("appointed counter can read when visibility is on", () => {
  const result = canReadLinkedBallot({
    auditorVisible: true,
    callerIsAppointedCounter: true,
  })
  assert.equal(result.ok, true)
})

test("nobody can read a person-to-choice record when visibility is off", () => {
  const result = canReadLinkedBallot({
    auditorVisible: false,
    callerIsAppointedCounter: true,
  })
  assert.equal(result.ok, false)
})
