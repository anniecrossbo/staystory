"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  match?: string;
}

export function SideNav({ title, subtitle, items }: { title: string; subtitle?: string; items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav aria-label={title} className="w-full shrink-0 border-default-200 bg-content1 p-4 md:w-60 md:border-r md:p-5">
      <div className="px-3 pb-1 text-sm font-semibold text-foreground">{title}</div>
      {subtitle && <div className="px-3 pb-4 text-xs text-default-500">{subtitle}</div>}
      <ul className="flex gap-1 overflow-x-auto md:flex-col">
        {items.map((it) => {
          const active = it.match ? path.startsWith(it.match) : path === it.href;
          return (
            <li key={it.href}>
              <NextLink
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap rounded-medium px-3 py-2 text-sm transition-colors ${
                  active ? "bg-primary-50 font-semibold text-primary-700" : "text-default-700 hover:bg-default-100"
                }`}
              >
                {it.label}
              </NextLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
