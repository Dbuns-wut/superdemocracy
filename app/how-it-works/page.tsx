import Link from "next/link"

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white text-[#0E1C36]">
      <article className="mx-auto max-w-3xl px-6 py-14">
        <Link href="/" className="text-sm font-semibold text-zinc-500 hover:text-[#0E1C36]">
          Back
        </Link>
        <h1 className="mt-6 text-3xl font-bold sm:text-4xl">How it works</h1>
        <p className="mt-4 text-base leading-relaxed text-zinc-600">
          Sign up, then open Organizations. From there you can start a group, ask a question, and vote.
        </p>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Host an election, referendum, or poll</h2>
          <p className="mt-3 text-base leading-relaxed text-zinc-600">
            Create an organization and give it a name. A club or neighborhood chooses Community. A union or government
            chooses Governance.
          </p>
          <p className="mt-3 text-base leading-relaxed text-zinc-600">
            Open the organization, go to Polls or Votes, and write the question and the choices. Say when people can
            vote. A governance organization can also turn a petition into a referendum.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Vote from home, on any device</h2>
          <p className="mt-3 text-base leading-relaxed text-zinc-600">
            Open the site on your phone or your computer. Read the perspectives, make your choice, and vote while the
            question is open. You vote once. Everyone can see the result.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Start and sign a petition</h2>
          <p className="mt-3 text-base leading-relaxed text-zinc-600">
            In a governance organization, a member can write a petition and other members can sign it. When enough
            people have signed, it can become a referendum the organization votes on.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Security, and counting the ballots</h2>
          <p className="mt-3 text-base leading-relaxed text-zinc-600">
            Everyone can see the result. The organization decides who can see each choice.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Built for every group</h2>
          <p className="mt-3 text-base leading-relaxed text-zinc-600">
            A community club can run polls and votes. A union or a government can do that too, and can also use
            petitions and referendums.
          </p>
        </section>
      </article>
    </div>
  )
}
