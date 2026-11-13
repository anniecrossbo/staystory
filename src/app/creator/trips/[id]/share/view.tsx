"use client";

import { Button, Snippet, addToast } from "@heroui/react";
import { LinkButton } from "@/components/LinkButton";
import { inr } from "@/lib/format";

export function ShareView({ published, tripId, title, path, fullUrl, example }: { published: boolean; tripId: string; title: string; path: string; fullUrl: string; example: { value: number; share: number } }) {
  if (!published) {
    return (
      <div className="flex flex-col gap-4 p-5 pt-8">
        <h1 className="text-2xl font-bold">This trip isn&apos;t live yet</h1>
        <p className="text-default-600">Publish it to get your link.</p>
        <LinkButton href={`/creator/trips/${tripId}/review`} color="primary" size="lg" radius="lg">
          Review and publish
        </LinkButton>
      </div>
    );
  }

  const placements = [
    { label: "Instagram bio", text: `Plan my trips: ${fullUrl}` },
    { label: "Story link sticker", text: fullUrl },
    { label: "YouTube description", text: `Book this exact trip, or change dates and stays: ${fullUrl}` },
    { label: "Auto-reply to DMs", text: `Here's the full trip with prices, you can book it here: ${fullUrl}` },
  ];

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      addToast({ title: `Copied for ${label}`, color: "success" });
    } catch {
      addToast({ title: "Copy didn't work", description: "Select the link and copy it by hand.", color: "warning" });
    }
  }

  return (
    <div className="flex flex-col gap-6 p-5 pt-8">
      <div>
        <h1 className="text-[26px] font-bold leading-tight tracking-tight">Your trip is live</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-default-600">
          Share one link wherever you post &ldquo;{title}&rdquo;. Followers can change dates, stays and activities, and you still earn on the booking.
        </p>
      </div>
      <Snippet symbol="" color="primary" variant="bordered" size="lg" codeString={fullUrl} classNames={{ base: "w-full", pre: "truncate font-sans font-semibold" }} onCopy={() => addToast({ title: "Link copied", color: "success" })}>
        {`crossbo.in${path.replace("/t", "")}`}
      </Snippet>
      <section aria-labelledby="place-h">
        <h2 id="place-h" className="mb-3 text-base font-semibold">
          Put it where followers ask
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {placements.map((p) => (
            <Button key={p.label} variant="bordered" radius="lg" className="h-14 whitespace-normal" onPress={() => copy(p.text, p.label)}>
              {p.label}
            </Button>
          ))}
        </div>
      </section>
      <section className="rounded-large bg-default-100 p-4 text-sm" aria-labelledby="earn-h">
        <h2 id="earn-h" className="mb-2 text-base font-semibold">
          How you earn
        </h2>
        <div className="flex justify-between py-1">
          <span className="text-default-600">Your share of a {inr(example.value)} group booking</span>
          <span className="font-semibold tabular-nums">{inr(example.share)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-default-600">Shows as</span>
          <span className="font-semibold">Pending, at booking</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-default-600">Becomes earnings</span>
          <span className="font-semibold">After checkout</span>
        </div>
      </section>
      <div className="flex flex-col gap-2 pb-2">
        <LinkButton href={path} size="lg" radius="lg" variant="flat">
          Preview as a follower
        </LinkButton>
        <LinkButton href="/creator" size="lg" radius="lg" variant="light">
          See earnings
        </LinkButton>
      </div>
    </div>
  );
}
