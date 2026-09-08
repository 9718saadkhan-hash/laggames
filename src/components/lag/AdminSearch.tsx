import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";

/** Shared search bar for admin list pages. */
export function AdminSearch({
  value,
  onChange,
  placeholder = "Search…",
  count,
  label = "items",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  count?: number;
  label?: string;
}) {
  return (
    <div className="glass mb-4 rounded-2xl p-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-11 pr-10 pl-10"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
      {typeof count === "number" && value ? (
        <p className="mt-2 px-1 text-xs text-muted-foreground" aria-live="polite">
          {count} {label} found
        </p>
      ) : null}
    </div>
  );
}

/** Simple text search over selected fields of a record list. */
export function useAdminSearch<T>(items: T[], fields: (item: T) => (string | null | undefined | number)[]) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      fields(item)
        .filter((v) => v !== null && v !== undefined)
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query]);
  return { query, setQuery, results };
}
