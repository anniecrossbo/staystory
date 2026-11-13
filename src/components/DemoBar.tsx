"use client";

import { Button, Tab, Tabs, addToast } from "@heroui/react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { resetDemo, setRole } from "@/app/actions";

type Role = "creator" | "traveler" | "hotel";
const HOME: Record<Role, string> = { creator: "/creator/new", traveler: "/traveler", hotel: "/hotel" };

export function DemoBar({ role }: { role: Role }) {
  const router = useRouter();
  const path = usePathname();
  const [pending, start] = useTransition();
  const fromPath: Role | null = path.startsWith("/creator") ? "creator" : path.startsWith("/hotel") ? "hotel" : path.startsWith("/traveler") || path.startsWith("/bookings") ? "traveler" : null;
  const shown = fromPath ?? role;

  return (
    <div className="sticky top-0 z-40 border-b border-default-200 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-2">
        <NextLink href="/" className="text-lg font-bold tracking-tight text-foreground">
          CrossBo
        </NextLink>
        <span className="hidden text-sm text-default-500 sm:inline">Demo as</span>
        <Tabs
          aria-label="Demo role"
          size="sm"
          radius="full"
          color="primary"
          selectedKey={shown}
          onSelectionChange={(key) => {
            const r = key as Role;
            start(async () => {
              await setRole(r);
              router.push(HOME[r]);
            });
          }}
        >
          <Tab key="creator" title="Creator" />
          <Tab key="traveler" title="Traveler" />
          <Tab key="hotel" title="Hotel" />
        </Tabs>
        <div className="ml-auto">
          <Button
            size="sm"
            variant="flat"
            isLoading={pending}
            onPress={() =>
              start(async () => {
                await resetDemo();
                router.push("/");
                addToast({ title: "Demo reset", description: "All data is back to the starting seed.", color: "success" });
              })
            }
          >
            Reset demo
          </Button>
        </div>
      </div>
    </div>
  );
}
