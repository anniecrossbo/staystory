import { SideNav } from "./SideNav";

const ITEMS = [
  { href: "/hotel", label: "Overview" },
  { href: "/hotel/reservations", label: "Reservations", match: "/hotel/reservations" },
  { href: "/hotel/campaigns/new", label: "Creator campaigns", match: "/hotel/campaigns" },
  { href: "/hotel/gap-night", label: "Gap Night", match: "/hotel/gap-night" },
];

export function HotelShell({ hotelName, children }: { hotelName: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-57px)] max-w-6xl flex-col md:flex-row">
      <SideNav title={hotelName} subtitle="CrossBo for hotels" items={ITEMS} />
      <main className="min-w-0 flex-1 p-5 md:p-8">{children}</main>
    </div>
  );
}
