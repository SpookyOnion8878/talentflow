"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption = { value: string; label: string };

/**
 * Token-styled select with a proper listbox (Radix underlay): keyboard
 * navigation, correct contrast in both themes — the native <select> popup
 * ignores our dark theme.
 */
export function StatusSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel?: string;
}) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onChange}>
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm text-text-hi shadow-sm transition-colors hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
      >
        <SelectPrimitive.Value placeholder="Select…" />
        <SelectPrimitive.Icon>
          <ChevronDown className="h-4 w-4 text-text-lo" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-50 min-w-[10rem] overflow-hidden rounded-lg border border-border bg-surface shadow-xl"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="relative flex cursor-pointer select-none items-center gap-2 rounded-md py-2 pl-8 pr-3 text-sm text-text-mid outline-none data-[highlighted]:bg-surface-2 data-[highlighted]:text-text-hi"
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2">
                  <Check className="h-4 w-4 text-primary-500" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>
                  {option.label}
                </SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
