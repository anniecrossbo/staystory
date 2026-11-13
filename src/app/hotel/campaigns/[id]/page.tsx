import { notFound } from "next/navigation";
import { HotelShell } from "@/components/HotelShell";
import { getStore } from "@/lib/store";
import { getHotel, matchedCreators } from "@/lib/queries";
import { MatchedView } from "./view";

export default function CampaignPage({ params }: { params: { id: string } }) {
  const s = getStore();
  const campaign = s.campaigns.find((c) => c.id === params.id);
  if (!campaign) notFound();
  const hotel = getHotel(campaign.hotelId)!;
  const matches = matchedCreators(campaign).map((m) => ({
    id: m.creator.id,
    handle: m.creator.handle,
    initials: m.creator.initials,
    bookings: m.bookings,
    conversion: m.conversion,
    reasons: m.reasons,
  }));
  return (
    <HotelShell hotelName={hotel.name}>
      <MatchedView
        campaign={{ id: campaign.id, name: campaign.name, status: campaign.status, invited: campaign.invitedCreatorIds, creatorPrice: campaign.creatorPrice, validFrom: campaign.validFrom, validTo: campaign.validTo }}
        matches={matches}
      />
    </HotelShell>
  );
}
