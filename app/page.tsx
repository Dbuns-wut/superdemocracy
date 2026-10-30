import Link from "next/link"
import { BrandMark } from "@/components/BrandMark"
import { WelcomeCard } from "@/components/WelcomeCard"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-[#0E1C36]">
      <section className="bg-[radial-gradient(circle_at_top,#E7EEFB_0%,#ffffff_58%)] px-6 pb-4 pt-14">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <h1 className="m-0">
            <BrandMark className="mx-auto w-72 sm:w-80" />
          </h1>
          <div className="mt-8">
            <WelcomeCard />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-16 pt-2">
        <h2 className="text-3xl font-bold sm:text-4xl">Online voting you can trust.</h2>
        <ul className="mt-6 list-disc space-y-3 pl-5 text-base leading-relaxed text-zinc-600">
          <li>
            <span className="font-semibold text-[#0E1C36]">Host</span> elections, referendums and polls in minutes.
          </li>
          <li>
            <span className="font-semibold text-[#0E1C36]">Vote</span> from home, on any device.
          </li>
          <li>
            <span className="font-semibold text-[#0E1C36]">Start and sign</span> petitions to bring issues forward.
          </li>
          <li>
            <span className="font-semibold text-[#0E1C36]">Security inspired by online banking,</span> and
            auditing done the same way as counting paper ballots.
          </li>
          <li>
            <span className="font-semibold text-[#0E1C36]">Built for every group,</span> from community clubs to unions
            and governments.
          </li>
        </ul>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <p className="text-base font-semibold text-[#0E1C36]">Welcome to the future of democracy.</p>
          <Link
            href="/how-it-works"
            className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            See how it works
          </Link>
        </div>
      </section>
    </div>
  )
}
