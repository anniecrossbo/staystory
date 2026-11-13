"use client";

import { useEffect, useRef } from "react";
import { recordVisit } from "@/app/actions";

export function VisitTracker({ tripId }: { tripId: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void recordVisit(tripId);
  }, [tripId]);
  return null;
}
