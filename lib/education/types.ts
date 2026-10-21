export type Perspective = {
  id: string
  title: string
  body: string
}

export type QuickDebrief = {
  what: string
  why: string
  known: string
  disputed: string
  uncertain: string
}

export type EvidenceItem = {
  id: string
  title: string
  body: string
}

export type SourceItem = {
  id: string
  title: string
  url: string
  note: string
}

export type ReferendumEducation = {
  /** Referendum contract address or community vote UUID. */
  referendumAddress: string
  quickDebrief: QuickDebrief
  /** Pros vs Cons (binary) or one card per option. */
  perspectives: Perspective[]
  evidence: EvidenceItem[]
  sources: SourceItem[]
  updatedAt: number
}

export function emptyQuickDebrief(): QuickDebrief {
  return {
    what: "",
    why: "",
    known: "",
    disputed: "",
    uncertain: "",
  }
}
