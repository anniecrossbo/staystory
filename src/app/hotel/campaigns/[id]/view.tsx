"use client";

import { Avatar, Button, Checkbox, CheckboxGroup, Chip, addToast, cn } from "@heroui/react";
import { useState, useTransition } from "react";
import { launchCampaign } from "@/app/actions";
import { LinkButton } from "@/components/LinkButton";
import { dayLabel, inr, pct } from "@/lib/format";

interface Match {
  id: string;
  handle: string;
  initials: string;
  bookings: number;
  conversion: number | null;
  reasons: string[];
}

export function MatchedView({
  campaign,
  matches,
}: {
  campaign: { id: string; name: string; status: "draft" | "live"; invited: string[]; creatorPrice: number; validFrom: string; validTo: string };
  matches: Match[];
}) {
  const live = campaign.status === "live";
  const [chosen, setChosen] = useState<string[]>(live ? campaign.invited : matches.filter((m) => m.bookings > 0).map((m) => m.id));
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-default-600">{live ? "Campaign live" : "Step 2 of 2: pick creators"}</p>
          <h1 className="text-[26px] font-bold tracking-tight">{campaign.name}</h1>
          <p className="text-sm text-default-600">
            {inr(campaign.creatorPrice)} a night, {dayLabel(campaign.validFrom, false)} to {dayLabel(campaign.validTo, false)}. Ranked by bookings, not follower count.
          </p>
        </div>
        {live && (
          <Chip color="success" variant="flat">
            Live
          </Chip>
        )}
      </div>

      <CheckboxGroup aria-label="Creators to invite" value={chosen} onValueChange={setChosen} isDisabled={live}>
        {matches.map((m) => (
          <Checkbox
            key={m.id}
            value={m.id}
            classNames={{
              base: cn("m-0 inline-flex w-full max-w-full items-center rounded-large border-2 border-default-200 bg-content1 p-4", "data-[selected=true]:border-primary"),
              label: "w-full",
            }}
          >
            <div className="flex w-full flex-wrap items-center gap-4">
              <Avatar name={m.initials} getInitials={(n) => n} color={m.bookings > 0 ? "primary" : "default"} />
              <div className="min-w-[200px] flex-1">
                <div className="font-semibold">@{m.handle}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {m.reasons.map((r) => (
                    <Chip key={r} size="sm" variant="flat">
                      {r}
                    </Chip>
                  ))}
                </div>
              </div>
              {m.bookings > 0 ? (
                <div className="flex gap-6 text-sm text-default-600">
                  <div>
                    <div className="text-lg font-bold text-foreground tabular-nums">{m.bookings}</div>
                    bookings with you
                  </div>
                  <div>
                    <div className="text-lg font-bold text-foreground tabular-nums">{m.conversion !== null ? pct(m.conversion, 2) : "–"}</div>
                    conversion
                  </div>
                </div>
              ) : (
                <div className="text-sm text-default-600">No bookings with you yet</div>
              )}
            </div>
          </Checkbox>
        ))}
      </CheckboxGroup>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-large bg-default-100 p-4">
        <p className="text-sm text-default-700">
          {live
            ? `${campaign.invited.length} creators are promoting this offer. Their trip pages now show your creator price.`
            : `${chosen.length} ${chosen.length === 1 ? "creator" : "creators"} selected. You pay only on completed stays.`}
        </p>
        {live ? (
          <LinkButton href="/hotel" variant="flat" radius="lg">
            Back to overview
          </LinkButton>
        ) : (
          <Button
            color="primary"
            radius="lg"
            size="lg"
            className="font-semibold"
            isLoading={pending}
            isDisabled={chosen.length === 0}
            onPress={() =>
              start(async () => {
                await launchCampaign(campaign.id, chosen);
                addToast({ title: "Campaign launched", description: "Invited creators' trips now show your price.", color: "success" });
              })
            }
          >
            Invite and launch campaign
          </Button>
        )}
      </div>
    </div>
  );
}
