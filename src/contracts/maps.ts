/** Contract: map display for trip locations. */

export interface MapMarker {
  lat: number;
  lng: number;
  label?: string;
}

export interface StaticMapRequest {
  center: { lat: number; lng: number };
  zoom: number;
  width: number;
  height: number;
  markers: MapMarker[];
}

export function staticMapUrl(req: StaticMapRequest): string {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!key) return "";
  const markers = req.markers
    .map((m) => `markers=color:red%7Clabel:${m.label ?? ""}%7C${m.lat},${m.lng}`)
    .join("&");
  return `https://maps.googleapis.com/maps/api/staticmap?center=${req.center.lat},${req.center.lng}&zoom=${req.zoom}&size=${req.width}x${req.height}&maptype=roadmap&${markers}&key=${key}`;
}
