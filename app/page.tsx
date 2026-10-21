"use client"

import { BrandMark } from "@/components/BrandMark"
import { WelcomeCard } from "@/components/WelcomeCard"

const points = [
  {
    title: "A community puts a question to its members",
    body: "Someone writes the question and the choices. Members vote once while it is open. Everyone can see the result.",
  },
  {
    title: "Your vote is counted",
    body: "When it goes through, the screen says the vote was accepted and counted. You do not get a receipt to pass around.",
  },
  {
    title: "The result is public. Your choice is not",
    body: "Members see the tally. An appointed counter can see who voted how, and only while the count is being checked.",
  },
  {
    title: "You can look around first",
    body: "A guest can read the site. An account is how you vote and how people see your name. A government ID check is not available yet. What an account can do will grow as more of that is checked.",
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-[#0E1C36]">
      <section className="bg-[radial-gradient(circle_at_top,#E7EEFB_0%,#ffffff_58%)] px-6 pb-16 pt-14">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <h1 className="m-0">
            <BrandMark className="mx-auto w-72 sm:w-80" />
          </h1>
          <div className="mt-8">
            <WelcomeCard />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-2xl font-bold">What this is for</h2>
        <div className="mt-8 space-y-8">
          {points.map((point) => (
            <div key={point.title}>
              <h3 className="text-lg font-semibold">{point.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{point.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
