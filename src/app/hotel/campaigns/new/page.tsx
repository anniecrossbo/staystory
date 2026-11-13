import NextLink from "next/link";
import { HotelShell } from "@/components/HotelShell";
import { getStore } from "@/lib/store";
import { getHotel } from "@/lib/queries";
import { addDays, toDay } from "@/lib/format";
import { AUDIENCE_TAGS, CAMPAIGN_PERKS } from "@/lib/catalog";
import { NewCampaignView } from "./view";

export default function NewCampaignPage() {
  const s = getStore();
  const hotel = getHotel(s.demoHotelId)!;
  const today = toDay(new Date());
  const existing = s.campaigns.filter((c) => c.hotelId === hotel.id);
  return (
    <HotelShell hotelName={hotel.name}>
      <NewCampaignView
        hotel={{ name: hotel.name, area: hotel.area, rate: hotel.rate, commissionPct: Math.round(hotel.commissionPct * 100) }}
        defaults={{ validFrom: today, validTo: addDays(today, 90) }}
        perks={CAMPAIGN_PERKS}
        audienceTags={AUDIENCE_TAGS}
      />
      {existing.length > 0 && (
        <section className="mt-8" aria-labelledby="existing-h">
          <h2 id="existing-h" className="mb-2 text-base font-semibold">
            Your campaigns
          </h2>
          <ul className="flex flex-col gap-2">
            {existing.map((c) => (
              <li key={c.id}>
                <NextLink href={`/hotel/campaigns/${c.id}`} className="flex justify-between rounded-large border border-default-200 bg-content1 p-3 text-sm hover:bg-default-50">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-default-600">{c.status === "live" ? `Live with ${c.invitedCreatorIds.length} creators` : "Draft"}</span>
                </NextLink>
              </li>
            ))}
          </ul>
        </section>
      )}
    </HotelShell>
  );
}
