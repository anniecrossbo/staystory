import { CreatorPhone } from "@/components/CreatorPhone";
import { SAMPLE_REELS } from "@/lib/samples";
import { getStore } from "@/lib/store";
import { NewTripView } from "./view";

export default function NewTripPage() {
  const s = getStore();
  const samples = SAMPLE_REELS.map(({ id, label, reelUrl, caption }) => ({ id, label, reelUrl, caption }));
  return (
    <CreatorPhone>
      <NewTripView samples={samples} cities={s.cities.map((c) => ({ id: c.id, name: c.name }))} liveEnabled={!!process.env.OPENAI_API_KEY} />
    </CreatorPhone>
  );
}
