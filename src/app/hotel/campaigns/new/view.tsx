"use client";

import { Button, Checkbox, CheckboxGroup, Chip, Input, cn } from "@heroui/react";
import { useState, useTransition } from "react";
import { createCampaign } from "@/app/actions";
import { inr } from "@/lib/format";

interface Props {
  hotel: { name: string; area: string; rate: number; commissionPct: number };
  defaults: { validFrom: string; validTo: string };
  perks: string[];
  audienceTags: string[];
}

export function NewCampaignView({ hotel, defaults, perks, audienceTags }: Props) {
  const [name, setName] = useState("Winter weekends by the lake");
  const [validFrom, setValidFrom] = useState(defaults.validFrom);
  const [validTo, setValidTo] = useState(defaults.validTo);
  const [chosenPerks, setChosenPerks] = useState<string[]>(["Breakfast included", "Late checkout"]);
  const [price, setPrice] = useState(String(hotel.rate - 400));
  const [commission, setCommission] = useState(String(hotel.commissionPct));
  const [audience, setAudience] = useState<string[]>(["Groups of friends", "Weekend trips", "Under ₹5,000 pp"]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const priceNum = Number(price) || 0;
  const commissionNum = Number(commission) || 0;
  const exampleValue = 20000;
  const exampleCommission = Math.round((exampleValue * commissionNum) / 100);
  const exampleCreator = Math.min(exampleCommission, Math.round(exampleValue * 0.08));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-default-600">Step 1 of 2: build the offer</p>
        <h1 className="text-[26px] font-bold tracking-tight">New creator campaign</h1>
      </div>
      <form
        className="flex flex-col gap-5 xl:flex-row xl:items-start"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            const res = await createCampaign({ name, validFrom, validTo, perks: chosenPerks, creatorPrice: priceNum, commissionPct: commissionNum, audience });
            if (res && "error" in res) setError(res.error);
          });
        }}
      >
        <section className="flex min-w-0 flex-1 flex-col gap-5 rounded-large border border-default-200 bg-content1 p-6" aria-label="Offer details">
          <Input label="Campaign name" labelPlacement="outside" value={name} onValueChange={setName} isRequired />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input type="date" label="Valid from" labelPlacement="outside" value={validFrom} onValueChange={setValidFrom} isRequired />
            <Input type="date" label="Valid until" labelPlacement="outside" value={validTo} min={validFrom} onValueChange={setValidTo} isRequired />
          </div>
          <CheckboxGroup label="What followers get" orientation="horizontal" value={chosenPerks} onValueChange={setChosenPerks} classNames={{ label: "text-sm font-medium text-foreground" }}>
            {perks.map((p) => (
              <Checkbox key={p} value={p} classNames={{ base: "m-0 mr-2 mb-2 rounded-medium border border-default-200 px-3 py-2" }}>
                {p}
              </Checkbox>
            ))}
          </CheckboxGroup>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              type="number"
              label="Creator price per night"
              labelPlacement="outside"
              startContent={<span className="text-sm text-default-500">₹</span>}
              description={`Public rate ${inr(hotel.rate)}`}
              value={price}
              onValueChange={setPrice}
              min={1}
            />
            <Input
              type="number"
              label="Commission on bookings"
              labelPlacement="outside"
              endContent={<span className="text-sm text-default-500">%</span>}
              description="Paid only on completed stays"
              value={commission}
              onValueChange={setCommission}
              min={5}
              max={30}
            />
          </div>
          <CheckboxGroup label="Who you want to reach" orientation="horizontal" value={audience} onValueChange={setAudience} classNames={{ label: "text-sm font-medium text-foreground" }}>
            {audienceTags.map((t) => (
              <Checkbox
                key={t}
                value={t}
                classNames={{
                  base: cn("m-0 mr-2 mb-2 rounded-full border border-default-200 px-3 py-1.5", "data-[selected=true]:border-primary data-[selected=true]:bg-primary-50"),
                }}
              >
                {t}
              </Checkbox>
            ))}
          </CheckboxGroup>
          {error && (
            <div role="alert" className="rounded-medium bg-danger-50 p-3 text-sm text-danger-700">
              {error}
            </div>
          )}
        </section>

        <aside className="flex w-full flex-col gap-3 xl:w-80" aria-labelledby="preview-h">
          <h2 id="preview-h" className="text-sm font-semibold text-default-600">
            How followers see it
          </h2>
          <div className="rounded-large border border-default-200 bg-content1 p-4">
            <Chip size="sm" color="primary" variant="flat">
              Creator deal
            </Chip>
            <div className="mt-2 font-semibold">{hotel.name}</div>
            <div className="text-sm text-default-600">{hotel.area}</div>
            {chosenPerks.length > 0 && <div className="mt-1 text-sm text-default-600">{chosenPerks.join(", ")}</div>}
            <div className="mt-2 font-bold tabular-nums">
              {inr(priceNum)} <span className="text-sm font-normal text-default-500 line-through">{inr(hotel.rate)}</span>
              <span className="text-sm font-normal text-default-600"> a night</span>
            </div>
          </div>
          <div className="rounded-large bg-default-100 p-4 text-sm text-default-700">
            On a {inr(exampleValue)} booking you pay {inr(exampleCommission)}. The creator gets {inr(exampleCreator)} and CrossBo {inr(exampleCommission - exampleCreator)}.
          </div>
          <Button type="submit" color="primary" size="lg" radius="lg" className="font-semibold" isLoading={pending}>
            Find matching creators
          </Button>
        </aside>
      </form>
    </div>
  );
}
