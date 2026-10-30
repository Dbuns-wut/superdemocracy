"use client"

import { useCallback, useEffect, useState } from "react"
import { useAccount, usePublicClient } from "wagmi"
import type { Address, Hex } from "viem"
import {
  GovernanceWalletError,
  bootstrapGovernanceWallet,
  connectGovernanceWallet,
  governanceSnapshot,
  governanceWalletMessage,
  refreshGovernanceWallet,
  signGovernanceMessage,
  subscribeGovernanceWallet,
  writeGovernanceContract,
} from "@/lib/governance-wallet"

export type GovernanceWallet = {
  address: Address | null
  available: boolean
  ready: boolean
  pending: boolean
  error: string
  connect: () => Promise<Address | null>
  signMessage: (message: string) => Promise<Hex>
  writeContract: (input: {
    address: Address
    abi: readonly unknown[]
    functionName: string
    args?: readonly unknown[]
  }) => Promise<Hex>
  writeAndConfirm: (input: {
    address: Address
    abi: readonly unknown[]
    functionName: string
    args?: readonly unknown[]
  }) => Promise<Hex>
}

export function useGovernanceWallet(): GovernanceWallet {
  const { address: connected } = useAccount()
  const publicClient = usePublicClient()
  const [address, setAddress] = useState<Address | null>(null)
  const [available, setAvailable] = useState(false)
  const [ready, setReady] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  const sync = useCallback(() => {
    const snap = governanceSnapshot()
    setAddress(snap.address)
    setAvailable(snap.available)
    setReady(true)
  }, [])

  useEffect(() => {
    bootstrapGovernanceWallet()
    sync()
    void refreshGovernanceWallet().then(sync)
    return subscribeGovernanceWallet(sync)
  }, [sync, connected])

  const connect = useCallback(async () => {
    setError("")
    setPending(true)
    try {
      const account = await connectGovernanceWallet()
      sync()
      return account
    } catch (err) {
      const messageText = governanceWalletMessage(err)
      setError(messageText)
      sync()
      throw new GovernanceWalletError(messageText)
    } finally {
      setPending(false)
    }
  }, [sync])

  const signMessage = useCallback(
    async (message: string) => {
      setError("")
      setPending(true)
      try {
        const signature = await signGovernanceMessage(message)
        sync()
        return signature
      } catch (err) {
        const messageText = governanceWalletMessage(err)
        setError(messageText)
        throw new GovernanceWalletError(messageText)
      } finally {
        setPending(false)
      }
    },
    [sync]
  )

  const writeContract = useCallback(
    async (input: {
      address: Address
      abi: readonly unknown[]
      functionName: string
      args?: readonly unknown[]
    }) => {
      setError("")
      setPending(true)
      try {
        const hash = await writeGovernanceContract(input)
        sync()
        return hash
      } catch (err) {
        const messageText = governanceWalletMessage(err)
        setError(messageText)
        throw new GovernanceWalletError(messageText)
      } finally {
        setPending(false)
      }
    },
    [sync]
  )

  const writeAndConfirm = useCallback(
    async (input: {
      address: Address
      abi: readonly unknown[]
      functionName: string
      args?: readonly unknown[]
    }) => {
      const hash = await writeContract(input)
      try {
        if (!publicClient) {
          throw new GovernanceWalletError("The action was sent, but this page could not confirm it.")
        }
        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        if (receipt.status !== "success") {
          throw new GovernanceWalletError("The wallet could not complete that action.")
        }
        return hash
      } catch (err) {
        const messageText = governanceWalletMessage(err)
        setError(messageText)
        throw new GovernanceWalletError(messageText)
      }
    },
    [publicClient, writeContract]
  )

  return {
    address,
    available,
    ready,
    pending,
    error,
    connect,
    signMessage,
    writeContract,
    writeAndConfirm,
  }
}
