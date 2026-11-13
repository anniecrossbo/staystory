import { SideNav } from "./SideNav";

const ITEMS = [
  { href: "/creator", label: "Earnings" },
  { href: "/creator/trips", label: "My trips", match: "/creator/trips" },
  { href: "/creator/new", label: "New trip from a reel" },
];

export function CreatorShell({ handle, children }: { handle: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-57px)] max-w-6xl flex-col md:flex-row">
      <SideNav title={`@${handle}`} subtitle="Creator" items={ITEMS} />
      <main className="min-w-0 flex-1 p-5 md:p-8">{children}</main>
    </div>
  );
}
