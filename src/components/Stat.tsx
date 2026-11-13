export function Stat({ label, value, note, tone = "default" }: { label: string; value: string; note?: string; tone?: "default" | "warning" | "success" }) {
  const tones = {
    default: "bg-content1 border-default-200",
    warning: "bg-warning-50 border-warning-200",
    success: "bg-success-50 border-success-200",
  };
  return (
    <div className={`rounded-large border p-4 ${tones[tone]}`}>
      <div className="text-sm text-default-600">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums tracking-tight">{value}</div>
      {note && <div className="mt-0.5 text-xs text-default-600">{note}</div>}
    </div>
  );
}
