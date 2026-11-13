import { LinkButton } from "@/components/LinkButton";

const STEPS = [
  { who: "Creator", text: "Paste the Udaipur sample reel. The agent turns it into a priced trip." },
  { who: "Creator", text: "Review the trip, publish it and copy the link." },
  { who: "Traveler", text: "Open the link, change dates and travelers, and book." },
  { who: "Hotel", text: "See the reservation arrive tagged with the creator." },
  { who: "Creator", text: "See the commission appear as pending." },
  { who: "Hotel", text: "Release Gap Night rooms. Switch to Traveler to see the deal." },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <p className="text-sm font-medium text-primary-600">Hackathon prototype</p>
      <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
        Creators inspire the trip.
        <br />
        CrossBo makes it bookable.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-default-600">
        A creator turns a reel into a trip with one trackable link. Followers book it as is or make it their own, and the creator still earns.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <LinkButton href="/creator/new" color="primary" size="lg" radius="lg">
          Start as a creator
        </LinkButton>
        <LinkButton href="/t/anaya.explores/udaipur" variant="flat" size="lg" radius="lg">
          Open a trip link
        </LinkButton>
        <LinkButton href="/hotel" variant="flat" size="lg" radius="lg">
          Hotel dashboard
        </LinkButton>
      </div>

      <section className="mt-14" aria-labelledby="script">
        <h2 id="script" className="text-lg font-semibold">The demo in six steps</h2>
        <p className="mt-1 text-sm text-default-600">Use the role switch at the top to move between people. Reset the demo between rehearsals.</p>
        <ol className="mt-5 space-y-3">
          {STEPS.map((s, i) => (
            <li key={i} className="flex gap-4 rounded-large border border-default-200 bg-content1 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{i + 1}</span>
              <div>
                <div className="text-xs font-semibold text-default-500">{s.who}</div>
                <div className="text-[15px]">{s.text}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
