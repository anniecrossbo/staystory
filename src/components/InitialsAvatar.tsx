"use client";

import { Avatar, AvatarGroup, type AvatarProps } from "@heroui/react";

export function InitialsAvatar({ initials, ...props }: Omit<AvatarProps, "name" | "getInitials"> & { initials: string }) {
  return <Avatar name={initials} getInitials={(n) => n} {...props} />;
}

export function InitialsGroup({ people, max = 5 }: { people: { id: string; initials: string }[]; max?: number }) {
  return (
    <AvatarGroup size="sm" max={max}>
      {people.map((p) => (
        <Avatar key={p.id} name={p.initials} getInitials={(n) => n} />
      ))}
    </AvatarGroup>
  );
}
