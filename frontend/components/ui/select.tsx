"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, Search, X } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils/helpers";

export interface SelectOption {
  label: string;
  value: string;
  description?: string;
}

interface BaseProps {
  label?: string;
  placeholder?: string;
  error?: string;
  searchable?: boolean;
  className?: string;
}

interface SingleSelectProps extends BaseProps {
  value?: string;
  onChange: (value: string) => void;
  options: SelectOption[];
}

interface MultiSelectProps extends BaseProps {
  value: string[];
  onChange: (values: string[]) => void;
  options: SelectOption[];
  maxSelections?: number;
}

export function Select({ label, placeholder = "Select option", error, options, value, onChange, searchable, className }: SingleSelectProps) {
  const [search, setSearch] = React.useState("");
  const filtered = searchable
    ? options.filter((option) => option.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div className={cn("flex w-full flex-col gap-2 text-sm", className)}>
      {label && <span className="font-medium text-foreground/80">{label}</span>}
      <SelectPrimitive.Root value={value} onValueChange={onChange}>
        <SelectPrimitive.Trigger
          className={cn(
            "flex items-center justify-between rounded-xl border border-border/60 bg-white/80 px-4 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
            error && "border-red-400",
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon>
            <ChevronDown className="h-4 w-4 text-foreground/60" aria-hidden />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content className="z-50 rounded-xl border border-border/40 bg-white p-2 shadow-xl">
            {searchable && (
              <div className="mb-2 flex items-center rounded-lg border border-border/60 px-3">
                <Search className="h-4 w-4 text-foreground/40" aria-hidden />
                <input
                  className="ml-2 w-full bg-transparent py-2 text-sm outline-none"
                  placeholder="Search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                {search && (
                  <button type="button" onClick={() => setSearch("")} className="text-foreground/40" aria-label="Clear search">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
            <SelectPrimitive.Viewport className="max-h-60 space-y-1">
              {filtered.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-foreground/80 outline-none data-[highlighted]:bg-accent/10"
                >
                  <SelectPrimitive.ItemText>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      {option.description && <span className="text-xs text-foreground/60">{option.description}</span>}
                    </div>
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator>
                    <Check className="h-4 w-4 text-accent" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

export function MultiSelect({ label, placeholder = "Select options", error, options, value, onChange, searchable, maxSelections, className }: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filtered = searchable
    ? options.filter((option) => option.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const toggleValue = (optionValue: string) => {
    const exists = value.includes(optionValue);
    if (exists) {
      onChange(value.filter((item) => item !== optionValue));
    } else if (!maxSelections || value.length < maxSelections) {
      onChange([...value, optionValue]);
    }
  };

  return (
    <div className={cn("flex w-full flex-col gap-2 text-sm", className)}>
      {label && <span className="font-medium text-foreground/80">{label}</span>}
      <DropdownMenuPrimitive.Root open={open} onOpenChange={setOpen}>
        <DropdownMenuPrimitive.Trigger asChild>
          <button
            type="button"
            className={cn(
              "flex min-h-[44px] w-full flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-white/80 px-4 py-2 text-left text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
              error && "border-red-400",
            )}
          >
            {value.length ? (
              <div className="flex flex-wrap gap-2">
                {value.map((val) => {
                  const option = options.find((opt) => opt.value === val);
                  return (
                    <span key={val} className="rounded-full bg-accent/10 px-3 py-1 text-xs text-accent">
                      {option?.label ?? val}
                    </span>
                  );
                })}
              </div>
            ) : (
              <span className="text-foreground/60">{placeholder}</span>
            )}
            <ChevronDown className="ml-auto h-4 w-4 text-foreground/50" aria-hidden />
          </button>
        </DropdownMenuPrimitive.Trigger>
        <DropdownMenuPrimitive.Content className="z-50 mt-2 w-72 rounded-xl border border-border/40 bg-white p-2 shadow-xl">
          {searchable && (
            <div className="mb-2 flex items-center rounded-lg border border-border/60 px-3">
              <Search className="h-4 w-4 text-foreground/40" aria-hidden />
              <input
                className="ml-2 w-full bg-transparent py-2 text-sm outline-none"
                placeholder="Search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="text-foreground/40" aria-label="Clear search">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
          <div className="max-h-64 overflow-y-auto">
            {filtered.map((option) => {
              const checked = value.includes(option.value);
              return (
                <DropdownMenuPrimitive.CheckboxItem
                  key={option.value}
                  checked={checked}
                  onCheckedChange={() => toggleValue(option.value)}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-foreground/80 outline-none data-[highlighted]:bg-accent/10"
                >
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    {option.description && <span className="text-xs text-foreground/60">{option.description}</span>}
                  </div>
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border text-xs",
                      checked ? "border-accent bg-accent text-white" : "border-border/70",
                    )}
                  >
                    {checked && <Check className="h-3 w-3" aria-hidden />}
                  </span>
                </DropdownMenuPrimitive.CheckboxItem>
              );
            })}
          </div>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Root>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
