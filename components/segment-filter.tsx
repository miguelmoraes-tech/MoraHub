"use client";

import { Filter } from "lucide-react";

export function SegmentFilter({
  value,
  options,
  allLabel,
  onChange,
}: {
  value: string;
  options: string[];
  allLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
      <Filter className="h-3.5 w-3.5 text-zinc-500" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-sm text-zinc-300 outline-none"
      >
        <option value="" className="bg-zinc-900">
          {allLabel}
        </option>
        {options.map((option) => (
          <option key={option} value={option} className="bg-zinc-900">
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
