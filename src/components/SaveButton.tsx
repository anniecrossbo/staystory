"use client";

import { Button } from "@heroui/react";
import { useTransition } from "react";
import { toggleSave } from "@/app/actions";

export function SaveButton({ tripId, saved }: { tripId: string; saved: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button size="sm" radius="full" variant={saved ? "solid" : "bordered"} color={saved ? "primary" : "default"} isLoading={pending} onPress={() => start(() => toggleSave(tripId))} aria-pressed={saved}>
      {saved ? "Saved" : "Save trip"}
    </Button>
  );
}
