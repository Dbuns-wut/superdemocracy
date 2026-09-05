export type Perspective = {
  id: string
  title: string
  body: string
}

export type ReferendumEducation = {
  referendumAddress: string
  perspectives: Perspective[]
  updatedAt: number
}
