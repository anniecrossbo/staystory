import { HotelShell } from "@/components/HotelShell";
import { getStore } from "@/lib/store";
import { addDays, toDay } from "@/lib/format";
import { getCreator, getHotel, getTrip, hotelStats, occupancy } from "@/lib/queries";
import { HotelDashboardView } from "./view";

export default function HotelPage() {
  const s = getStore();
  const hotel = getHotel(s.demoHotelId)!;
  const st = hotelStats(hotel.id);
  const newest = st.newest;
  const start = toDay(new Date());
  const lowNights = Array.from({ length: 60 }, (_, i) => addDays(start, i + 1))
    .map((d) => ({ night: d, ...occupancy(hotel, d) }))
    .filter((n) => n.free / hotel.totalRooms >= 0.6)
    .slice(0, 4);
  return (
    <HotelShell hotelName={hotel.name}>
      <HotelDashboardView
        hotel={{ name: hotel.name, cityName: s.cities.find((c) => c.id === hotel.cityId)!.name, commissionPct: hotel.commissionPct, totalRooms: hotel.totalRooms }}
        stats={{ bookings: st.bookings, value: st.value, commission: st.commission, guests: st.guests, costPerGuest: st.costPerGuest, cancellationRate: st.cancellationRate }}
        byCreator={st.byCreator.map((r) => ({ handle: r.creator.handle, views: r.views, bookings: r.bookings, conversion: r.conversion, value: r.value }))}
        newest={
          newest
            ? {
                id: newest.id,
                isNew: !newest.hotelAcknowledged && newest.status === "pending",
                handle: getCreator(newest.creatorId)?.handle ?? null,
                tripTitle: getTrip(newest.tripId)?.title ?? "",
                checkIn: newest.checkIn,
                checkOut: newest.checkOut,
                rooms: newest.rooms,
                travelers: newest.travelers,
                value: newest.value,
                commission: newest.hotelCommission,
                gap: !!newest.gapReleaseId,
              }
            : null
        }
        lowNights={lowNights}
        liveCampaigns={s.campaigns.filter((c) => c.hotelId === hotel.id && c.status === "live").map((c) => ({ id: c.id, name: c.name, invited: c.invitedCreatorIds.length }))}
        gaps={s.gapReleases.filter((g) => g.hotelId === hotel.id).map((g) => ({ id: g.id, nights: g.nights, rooms: g.rooms, roomsLeft: g.roomsLeft, rate: g.rate }))}
      />
    </HotelShell>
  );
}
