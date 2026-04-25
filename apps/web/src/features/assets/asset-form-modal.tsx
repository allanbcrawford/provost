"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Input,
  Label,
} from "@provost/ui";
import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

// Mirrors convex/assets.ts ASSET_TYPES. Kept in sync manually because the
// Convex export isn't a value the client should import directly (would pull
// in server modules). If you change this list, update both places.
export const ASSET_TYPES = [
  "Brokerage",
  "Private Equity",
  "Real Estate",
  "Checking",
  "Entities",
] as const;
type AssetType = (typeof ASSET_TYPES)[number];

type Liquidity = "liquid" | "illiquid";

export interface AssetFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyId: Id<"families">;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AssetFormModal({ open, onOpenChange, familyId }: AssetFormModalProps) {
  const createAsset = useMutation(api.assets.create);

  const [name, setName] = useState("");
  const [type, setType] = useState<AssetType>(ASSET_TYPES[0]);
  const [value, setValue] = useState<string>("");
  const [currency, setCurrency] = useState<string>("USD");
  const [asOfDate, setAsOfDate] = useState<string>(todayISO);
  const [liquidity, setLiquidity] = useState<Liquidity | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setType(ASSET_TYPES[0]);
    setValue("");
    setCurrency("USD");
    setAsOfDate(todayISO());
    setLiquidity("");
    setError(null);
    setSubmitting(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      setError("Value must be a number.");
      return;
    }
    if (!asOfDate) {
      setError("As-of date is required.");
      return;
    }

    setSubmitting(true);
    try {
      await createAsset({
        familyId,
        name: trimmedName,
        type,
        value: numericValue,
        currency: currency.trim() || "USD",
        asOfDate,
        ...(liquidity ? { liquidity } : {}),
      });
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create asset.");
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-5 p-6 md:p-8">
          <div className="flex flex-col gap-1">
            <DialogTitle className="font-semibold text-[22px] text-provost-text-primary tracking-[-0.44px]">
              Add asset
            </DialogTitle>
            <DialogDescription className="text-[14px] text-provost-text-secondary">
              Enter asset details manually. PDF upload coming soon.
            </DialogDescription>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="asset-name">Name</Label>
              <Input
                id="asset-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Schwab Brokerage — Joint"
                required
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="asset-type">Type</Label>
              <select
                id="asset-type"
                value={type}
                onChange={(e) => setType(e.target.value as AssetType)}
                className="flex h-9 w-full min-w-0 rounded-[8px] border border-provost-border-subtle bg-white px-3 py-1 text-provost-text-primary text-sm shadow-xs outline-none focus-visible:border-provost-border-default focus-visible:ring-2 focus-visible:ring-provost-border-default/30"
              >
                {ASSET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="asset-value">Value</Label>
                <Input
                  id="asset-value"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="asset-currency">Currency</Label>
                <Input
                  id="asset-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  maxLength={3}
                  placeholder="USD"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="asset-as-of">As of</Label>
                <Input
                  id="asset-as-of"
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="asset-liquidity">Liquidity (optional)</Label>
                <select
                  id="asset-liquidity"
                  value={liquidity}
                  onChange={(e) => setLiquidity(e.target.value as Liquidity | "")}
                  className="flex h-9 w-full min-w-0 rounded-[8px] border border-provost-border-subtle bg-white px-3 py-1 text-provost-text-primary text-sm shadow-xs outline-none focus-visible:border-provost-border-default focus-visible:ring-2 focus-visible:ring-provost-border-default/30"
                >
                  <option value="">—</option>
                  <option value="liquid">Liquid</option>
                  <option value="illiquid">Illiquid</option>
                </select>
              </div>
            </div>
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700"
            >
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Adding…" : "Add asset"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
