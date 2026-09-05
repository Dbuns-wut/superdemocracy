"use client"

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react"
import { getAddress } from "viem"

const OrganizationAddressContext = createContext<
  `0x${string}` | undefined
>(undefined)

/** Supplies the org contract address for `/orgs/[address]` and any descendant hooks. */
export function OrganizationAddressProvider({
  address,
  children,
}: {
  address: string | undefined
  children: ReactNode
}) {
  const value = useMemo(() => {
    if (!address) return undefined
    try {
      return getAddress(address as `0x${string}`)
    } catch {
      return undefined
    }
  }, [address])

  return (
    <OrganizationAddressContext.Provider value={value}>
      {children}
    </OrganizationAddressContext.Provider>
  )
}

/** Org-scoped pages set this via `OrganizationAddressProvider`; global pages leave it undefined. */
export function useOptionalOrganizationAddress(): `0x${string}` | undefined {
  return useContext(OrganizationAddressContext)
}
