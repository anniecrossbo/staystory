import { InitialsAvatar } from "./InitialsAvatar";

export function CreatorTag({ handle, initials, label = "Recommended by", size = "md" }: { handle: string; initials: string; label?: string; size?: "sm" | "md" }) {
  return (
    <div className={`flex items-center gap-3 rounded-large bg-primary-50 ${size === "sm" ? "px-3 py-2" : "px-3 py-2.5"}`}>
      <InitialsAvatar initials={initials} size="sm" color="primary" />
      <div className="leading-tight">
        <div className="text-xs text-primary-700">{label}</div>
        <div className="text-sm font-semibold text-primary-800">@{handle}</div>
      </div>
    </div>
  );
}
