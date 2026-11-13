import { CreatorShell } from "@/components/CreatorShell";
import { getStore } from "@/lib/store";
import { creatorStats, getCity, getCreator, getTrip } from "@/lib/queries";
import { CreatorDashboardView } from "./view";

export default function CreatorDashboardPage() {
  const s = getStore();
  const creator = getCreator(s.demoCreatorId)!;
  const st = creatorStats(creator.id);
  const rows = st.recent.slice(0, 8).map((b) => ({
    id: b.id,
    city: getCity(getTrip(b.tripId)?.cityId ?? "")?.name ?? "",
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    travelers: b.travelers,
    value: b.value,
    share: b.creatorShare,
    status: b.status,
    isNew: !b.hotelAcknowledged && b.status === "pending",
  }));
  return (
    <CreatorShell handle={creator.handle}>
      <CreatorDashboardView
        name={creator.name}
        handle={creator.handle}
        stats={{ visits: st.visits, saves: st.saves, bookings: st.bookings, conversion: st.conversion, avgValue: st.avgValue, pending: st.pending, confirmed: st.confirmed }}
        rows={rows}
        trips={st.perTrip.map((p) => ({ id: p.trip.id, title: p.trip.title, visits: p.visits, bookings: p.bookings }))}
        bands={st.bands}
      />
    </CreatorShell>
  );
}
