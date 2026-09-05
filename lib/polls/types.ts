export type PollType = "single" | "multi"

export type Poll = {
  id: string
  orgId: string
  title: string
  description: string
  options: string[]
  type: PollType
  startTime: number
  endTime: number
  createdAt: number
}

export type Vote = {
  pollId: string
  voterId: string
  choices: number[]
  timestamp: number
}

/** Poll row returned from list endpoints with tally and optional current-user vote. */
export type PollWithSummary = Poll & {
  tally: number[]
  totalVotes: number
  currentUserChoices: number[] | null
}

