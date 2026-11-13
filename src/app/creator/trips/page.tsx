import { Chip } from "@heroui/react";
import NextLink from "next/link";
import { CreatorPhone } from "@/components/CreatorPhone";
import { LinkButton } from "@/components/LinkButton";
import { getStore } from "@/lib/store";
import { getCity, tripVisits } from "@/lib/queries";

export default function MyTripsPage() {
  const s = getStore();
  const trips = s.trips.filter((t) => t.creatorId === s.demoCreatorId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <CreatorPhone>
      <div className="flex flex-col gap-4 p-5 pt-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">My trips</h1>
          <LinkButton href="/creator/new" color="primary" size="sm" radius="full">
            New from a reel
          </LinkButton>
        </div>
        <ul className="flex flex-col gap-3">
          {trips.map((t) => (
            <li key={t.id}>
              <NextLink
                href={t.status === "published" ? `/creator/trips/${t.id}/share` : `/creator/trips/${t.id}/review`}
                className="flex items-center justify-between gap-3 rounded-large border border-default-200 p-4 hover:bg-default-50"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold">{t.title}</div>
                  <div className="text-sm text-default-600">
                    {getCity(t.cityId)?.name}, {t.days.length} days{t.status === "published" ? `. ${tripVisits(t.id).toLocaleString("en-IN")} visits` : ""}
                  </div>
                </div>
                <Chip size="sm" variant="flat" color={t.status === "published" ? "success" : "warning"}>
                  {t.status === "published" ? "Live" : "Draft"}
                </Chip>
              </NextLink>
            </li>
          ))}
        </ul>
      </div>
    </CreatorPhone>
  );
}
