"use client"

import { shortAddress } from "@/lib/address"
import type { GovernanceWallet } from "@/hooks/useGovernanceWallet"

/** Shown only on governance actions. Community pages do not mount this. */
export function GovernanceWalletControl({ wallet }: { wallet: GovernanceWallet }) {
  if (!wallet.ready) return null

  return (
    <div className="max-w-xl">
      {wallet.address ? (
        <p className="text-sm text-zinc-600">Account {shortAddress(wallet.address)}</p>
      ) : (
        <p className="text-sm text-zinc-600">Sign in. This organization uses your account.</p>
      )}
      {wallet.error ? <p className="mt-2 text-sm text-red-700">{wallet.error}</p> : null}
    </div>
  )
}
