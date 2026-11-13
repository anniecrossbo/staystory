"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Phone } from "./Phone";

const TABS = [
  { href: "/creator/trips", label: "Trips", match: (p: string) => p.startsWith("/creator/trips") },
  { href: "/creator/new", label: "Create", match: (p: string) => p === "/creator/new" },
  { href: "/creator", label: "Earnings", match: (p: string) => p === "/creator" },
];

export function CreatorPhone({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <Phone>
      <div className="flex min-h-[inherit] flex-col">
        <div className="flex-1">{children}</div>
        <nav aria-label="Creator" className="sticky bottom-0 flex justify-around border-t border-default-200 bg-content1/95 py-2 backdrop-blur sm:rounded-b-large">
          {TABS.map((t) => {
            const active = t.match(path);
            return (
              <NextLink
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`min-w-20 rounded-medium px-3 py-2 text-center text-sm ${active ? "font-semibold text-primary" : "text-default-600"}`}
              >
                {t.label}
              </NextLink>
            );
          })}
        </nav>
      </div>
    </Phone>
  );
}
