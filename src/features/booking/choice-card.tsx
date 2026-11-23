import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Kartu pilihan berbasis radio asli: bisa dipakai dengan keyboard dan pembaca layar.
export function ChoiceCard({
  group,
  value,
  checked,
  onSelect,
  lead,
  children,
}: {
  group: string;
  value: string;
  checked: boolean;
  onSelect: (value: string) => void;
  lead?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "group flex cursor-pointer items-center gap-4 rounded-md border bg-card p-4 transition-[border-color,background-color,box-shadow] hover:border-primary hover:shadow-[0_4px_12px_rgb(27_36_33/0.06)]",
        "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-primary",
        checked && "border-primary bg-primary-50 shadow-[inset_0_0_0_1px_var(--color-primary)]",
      )}
    >
      <input
        className="sr-only"
        type="radio"
        name={group}
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
      />
      {lead}
      <span className="grid min-w-0 flex-1 gap-2">{children}</span>
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded-full",
          checked
            ? "bg-primary text-primary-foreground"
            : "text-transparent ring-2 ring-border-strong ring-inset",
        )}
      >
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    </label>
  );
}

export function Pill({
  icon,
  active,
  children,
}: {
  icon: ReactNode;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs leading-tight font-medium [&_svg]:size-3",
        active ? "bg-card text-primary" : "bg-muted text-muted-foreground",
      )}
    >
      {icon}
      <span>{children}</span>
    </span>
  );
}
