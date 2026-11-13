"use client";

interface MapMarker {
  lat: number;
  lng: number;
  label?: string;
}

interface StaticMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  width?: number;
  height?: number;
  markers?: MapMarker[];
  className?: string;
}

export function StaticMap({ center, zoom = 13, width = 400, height = 200, markers = [], className }: StaticMapProps) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!key) return null;

  const markerParams = markers.length
    ? markers.map((m) => `markers=color:red%7Clabel:${encodeURIComponent(m.label ?? "")}%7C${m.lat},${m.lng}`).join("&")
    : `markers=${center.lat},${center.lng}`;

  const src = `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat},${center.lng}&zoom=${zoom}&size=${width}x${height}&scale=2&maptype=roadmap&${markerParams}&key=${key}`;

  return (
    <img
      src={src}
      alt="Map"
      width={width}
      height={height}
      className={className}
      loading="lazy"
      style={{ borderRadius: "var(--heroui-radius-large, 12px)" }}
    />
  );
}
