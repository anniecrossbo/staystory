import { HotelShell } from "@/components/HotelShell";
import { getStore } from "@/lib/store";
import { getCreator, getHotel, getTrip, newestFirst } from "@/lib/queries";
import { ReservationsView } from "./view";

export default function ReservationsPage({ searchParams }: { searchParams: { id?: string } }) {
  const s = getStore();
  const hotel = getHotel(s.demoHotelId)!;
  const rows = s.bookings
    .filter((b) => b.hotelId === hotel.id)
    .sort(newestFirst)
    .map((b) => ({
      id: b.id,
      handle: getCreator(b.creatorId)?.handle ?? null,
      tripTitle: getTrip(b.tripId)?.title ?? "",
      guestName: b.guestName,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      rooms: b.rooms,
      travelers: b.travelers,
      value: b.value,
      commission: b.hotelCommission,
      lines: b.lines,
      status: b.status,
      acknowledged: b.hotelAcknowledged,
      gap: !!b.gapReleaseId,
      campaign: !!b.campaignId,
      selfBooking: b.selfBooking,
    }));
  return (
    <HotelShell hotelName={hotel.name}>
      <ReservationsView rows={rows} initialId={searchParams.id ?? rows[0]?.id} commissionPct={hotel.commissionPct} />
    </HotelShell>
  );
}
