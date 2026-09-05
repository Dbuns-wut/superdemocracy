import { keccak256, concat } from "viem"
import type { PetitionSignature } from "./types"

/** Deterministic leaf hash for one signature record. */
function leafHash(s: PetitionSignature): `0x${string}` {
  const payload = `${s.organizationAddress.toLowerCase()}\0${s.petitionId}\0${s.signer.toLowerCase()}\0${s.timestamp}`
  return keccak256(new TextEncoder().encode(payload))
}

/**
 * Builds a single root from leaf hashes using pairwise keccak256 (odd node duplicated).
 * Empty input uses a fixed empty-set sentinel hash.
 */
export function generateMerkleRoot(
  signatures: PetitionSignature[]
): `0x${string}` {
  if (signatures.length === 0) {
    return keccak256(new TextEncoder().encode("PETITION_SIGNATURES_EMPTY"))
  }

  const sorted = [...signatures].sort((a, b) => {
    const sa = a.signer.toLowerCase()
    const sb = b.signer.toLowerCase()
    if (sa !== sb) return sa < sb ? -1 : sa > sb ? 1 : 0
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp
    const oa = a.organizationAddress.toLowerCase()
    const ob = b.organizationAddress.toLowerCase()
    if (oa !== ob) return oa < ob ? -1 : oa > ob ? 1 : 0
    const pa = a.petitionId
    const pb = b.petitionId
    if (pa !== pb) return pa < pb ? -1 : pa > pb ? 1 : 0
    return 0
  })

  let level: `0x${string}`[] = sorted.map(leafHash)

  while (level.length > 1) {
    const next: `0x${string}`[] = []
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i]!
      const right = level[i + 1] ?? left
      next.push(keccak256(concat([left, right])))
    }
    level = next
  }

  return level[0]!
}
