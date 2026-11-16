import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NumberStepper({
  id,
  value,
  onChange,
  size = "lg",
}: {
  id: string;
  value: number;
  onChange: (v: number) => void;
  size?: "lg" | "sm";
}) {
  const set = (v: number) => onChange(Math.max(0, Math.min(100000, Number.isFinite(v) ? Math.floor(v) : 0)));
  const big = size === "lg";
  return (
    <div className="flex items-center gap-1.5">
      <Button type="button" variant="outline" size="icon" aria-label="Diminuir" onClick={() => set(value - 1)} disabled={value <= 0}>
        <Minus strokeWidth={1.75} />
      </Button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => set(e.target.value === "" ? 0 : Number(e.target.value))}
        onFocus={(e) => e.target.select()}
        className={`num rounded-lg border border-input bg-surface text-center font-bold outline-none transition-colors focus-visible:border-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none ${
          big ? "h-12 w-20 text-2xl" : "h-9 w-16 text-base"
        }`}
      />
      <Button type="button" variant="outline" size="icon" aria-label="Aumentar" onClick={() => set(value + 1)}>
        <Plus strokeWidth={1.75} />
      </Button>
    </div>
  );
}
