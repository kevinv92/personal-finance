"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCategories,
  getAccounts,
  getSavedFilters,
  createSavedFilter,
  type FilterCondition,
  type SavedFilter,
} from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const DATE_PRESETS = [
  { value: "last7days", label: "Last 7 days" },
  { value: "last30days", label: "Last 30 days" },
  { value: "lastMonth", label: "Last month" },
  { value: "thisMonth", label: "This month" },
  { value: "lastQuarter", label: "Last quarter" },
  { value: "thisQuarter", label: "This quarter" },
  { value: "lastYear", label: "Last year" },
  { value: "thisYear", label: "This year" },
  { value: "custom", label: "Custom range..." },
] as const;

interface FilterBarProps {
  conditions: FilterCondition[];
  onChange: (conditions: FilterCondition[]) => void;
}

export function FilterBar({ conditions, onChange }: FilterBarProps) {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });
  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => getAccounts(),
  });
  const { data: savedFilters = [] } = useQuery({
    queryKey: ["savedFilters"],
    queryFn: getSavedFilters,
  });

  const saveMutation = useMutation({
    mutationFn: createSavedFilter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedFilters"] });
    },
  });

  // Extract current values from conditions
  const dateCondition = conditions.find((c) => c.field === "date");
  const datePreset =
    dateCondition?.operator === "relative" ? dateCondition.value : "";
  const dateFrom =
    dateCondition?.operator === "between"
      ? (dateCondition.value as { from: string; to: string }).from
      : "";
  const dateTo =
    dateCondition?.operator === "between"
      ? (dateCondition.value as { from: string; to: string }).to
      : "";

  const categoryCondition = conditions.find((c) => c.field === "categoryName");
  const selectedCategories = categoryCondition
    ? Array.isArray(categoryCondition.value)
      ? categoryCondition.value
      : [categoryCondition.value as string]
    : [];

  const accountCondition = conditions.find((c) => c.field === "accountName");
  const selectedAccount = accountCondition
    ? Array.isArray(accountCondition.value)
      ? (accountCondition.value[0] ?? "")
      : (accountCondition.value as string)
    : "";

  const payeeCondition = conditions.find((c) => c.field === "payee");
  const payeeText = payeeCondition
    ? (payeeCondition.value as string[]).join(", ")
    : "";

  const memoCondition = conditions.find((c) => c.field === "memo");
  const memoText = memoCondition
    ? (memoCondition.value as string[]).join(", ")
    : "";

  const [customDate, setCustomDate] = useState(
    dateCondition?.operator === "between",
  );
  const [filterName, setFilterName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  function updateConditions(
    field: string,
    newCondition: FilterCondition | null,
  ) {
    const filtered = conditions.filter((c) => c.field !== field);
    if (newCondition) filtered.push(newCondition);
    onChange(filtered);
  }

  function handleDatePreset(value: string) {
    if (value === "custom") {
      setCustomDate(true);
      updateConditions("date", null);
    } else if (value === "all") {
      setCustomDate(false);
      updateConditions("date", null);
    } else {
      setCustomDate(false);
      updateConditions("date", {
        field: "date",
        operator: "relative",
        value: value as FilterCondition & {
          field: "date";
          operator: "relative";
        } extends { value: infer V }
          ? V
          : never,
      });
    }
  }

  function handleCustomDate(from: string, to: string) {
    if (from && to) {
      updateConditions("date", {
        field: "date",
        operator: "between",
        value: { from, to },
      });
    }
  }

  function handleTextFilter(field: "payee" | "memo", text: string) {
    if (!text.trim()) {
      updateConditions(field, null);
      return;
    }
    const values = text
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (values.length === 0) {
      updateConditions(field, null);
      return;
    }
    updateConditions(field, { field, operator: "contains", value: values });
  }

  function toggleCategory(name: string) {
    const updated = selectedCategories.includes(name)
      ? selectedCategories.filter((v) => v !== name)
      : [...selectedCategories, name];
    if (updated.length === 0) {
      updateConditions("categoryName", null);
    } else {
      updateConditions("categoryName", {
        field: "categoryName",
        operator: "in",
        value: updated,
      });
    }
  }

  function handleLoadFilter(filter: SavedFilter) {
    onChange(filter.conditions);
    setCustomDate(
      filter.conditions.some(
        (c) => c.field === "date" && c.operator === "between",
      ),
    );
  }

  function handleSave() {
    if (!filterName.trim() || conditions.length === 0) return;
    saveMutation.mutate(
      { name: filterName.trim(), conditions },
      {
        onSuccess: () => {
          setFilterName("");
          setShowSave(false);
        },
      },
    );
  }

  const activeCount = conditions.length;

  return (
    <div className="space-y-3 mb-6">
      {/* Saved filters row */}
      <div className="flex items-center gap-2">
        <Select
          value=""
          onValueChange={(id: string | null) => {
            if (!id) return;
            const filter = savedFilters.find((f) => f.id === id);
            if (filter) handleLoadFilter(filter);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Load saved filter..." />
          </SelectTrigger>
          <SelectContent>
            {savedFilters.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
            {savedFilters.length === 0 && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                No saved filters
              </div>
            )}
          </SelectContent>
        </Select>

        {activeCount > 0 && (
          <>
            {!showSave ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSave(true)}
              >
                Save filter
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Filter name..."
                  className="w-48 h-8"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!filterName.trim() || saveMutation.isPending}
                >
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSave(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange([])}
              className="ml-auto"
            >
              Clear all ({activeCount})
            </Button>
          </>
        )}
      </div>

      {/* Filter inputs row */}
      <div className="flex items-end gap-3 flex-wrap">
        {/* Date filter */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Date
          </Label>
          <Select
            value={customDate ? "custom" : (datePreset as string) || "all"}
            onValueChange={(val: string | null) => {
              if (val) handleDatePreset(val);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              {DATE_PRESETS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {customDate && (
          <>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                From
              </Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) =>
                  handleCustomDate(e.target.value, dateTo || e.target.value)
                }
                className="w-[150px]"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                To
              </Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) =>
                  handleCustomDate(dateFrom || e.target.value, e.target.value)
                }
                className="w-[150px]"
              />
            </div>
          </>
        )}

        {/* Category filter — multi-select combobox */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Category
          </Label>
          <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
            <PopoverTrigger className="inline-flex min-w-[160px] items-center justify-start gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm font-normal whitespace-nowrap h-8 hover:bg-accent cursor-pointer">
              {selectedCategories.length === 0
                ? "All"
                : `${selectedCategories.length} selected`}
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search categories..." />
                <CommandList>
                  <CommandEmpty>No categories found.</CommandEmpty>
                  <CommandGroup>
                    {categories.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={c.name}
                        onSelect={() => toggleCategory(c.name)}
                      >
                        <span className="mr-2">
                          {selectedCategories.includes(c.name) ? "✓" : " "}
                        </span>
                        {c.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
              {selectedCategories.length > 0 && (
                <div className="border-t p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      updateConditions("categoryName", null);
                      setCategoryOpen(false);
                    }}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Account filter */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Account
          </Label>
          <Select
            value={selectedAccount || "all"}
            onValueChange={(val: string | null) => {
              if (!val || val === "all") {
                updateConditions("accountName", null);
              } else {
                updateConditions("accountName", {
                  field: "accountName",
                  operator: "equals",
                  value: val,
                });
              }
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.name}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Payee filter */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Payee
          </Label>
          <input
            value={payeeText}
            onChange={(e) => handleTextFilter("payee", e.target.value)}
            placeholder="e.g. WOOLWORTHS, NEW WORLD"
            className="h-8 w-52 min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        {/* Memo filter */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Memo
          </Label>
          <input
            value={memoText}
            onChange={(e) => handleTextFilter("memo", e.target.value)}
            placeholder="e.g. SALARY"
            className="h-8 w-40 min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
      </div>

      {/* Active filter badges */}
      {selectedCategories.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {selectedCategories.map((name) => (
            <Badge
              key={name}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => toggleCategory(name)}
            >
              {name} ×
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
