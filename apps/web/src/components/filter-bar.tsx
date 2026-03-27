"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { resolveRelativeDate } from "@/lib/filter-engine";
import {
  getCategories,
  getAccounts,
  getBanks,
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

function findCondition(conditions: FilterCondition[], field: string) {
  return conditions.find((c) => c.field === field);
}

function extractSingleSelect(condition: FilterCondition | undefined): string {
  if (!condition) return "";
  const val = condition.value;
  if (Array.isArray(val)) return val[0] ?? "";
  return val as string;
}

function extractMultiSelect(condition: FilterCondition | undefined): string[] {
  if (!condition) return [];
  const val = condition.value;
  if (Array.isArray(val)) return val;
  return [val as string];
}

function extractTextValue(condition: FilterCondition | undefined): string {
  if (!condition) return "";
  return (condition.value as string[]).join(", ");
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
  const { data: banks = [] } = useQuery({
    queryKey: ["banks"],
    queryFn: getBanks,
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

  // --- Extract current values from conditions ---

  const dateCondition = findCondition(conditions, "date");
  const datePreset =
    dateCondition?.operator === "relative" ? dateCondition.value : "";
  const dateRange =
    dateCondition?.operator === "between"
      ? (dateCondition.value as { from: string; to: string })
      : null;
  const dateFrom = dateRange?.from ?? "";
  const dateTo = dateRange?.to ?? "";

  const selectedCategories = extractMultiSelect(
    findCondition(conditions, "categoryName"),
  );
  const selectedBank = extractSingleSelect(
    findCondition(conditions, "bankName"),
  );
  const selectedAccount = extractSingleSelect(
    findCondition(conditions, "accountName"),
  );

  const amountCondition = findCondition(conditions, "amount");
  const amountRange =
    amountCondition?.operator === "between"
      ? (amountCondition.value as { min: number; max: number })
      : null;
  const amountMin =
    amountRange && amountRange.min !== -Infinity ? amountRange.min : "";
  const amountMax =
    amountRange && amountRange.max !== Infinity ? amountRange.max : "";

  const payeeCondition = findCondition(conditions, "payee");
  const payeeOp = (payeeCondition?.operator as string) ?? "contains";
  const payeeText = extractTextValue(payeeCondition);

  const memoCondition = findCondition(conditions, "memo");
  const memoOp = (memoCondition?.operator as string) ?? "contains";
  const memoText = extractTextValue(memoCondition);

  const [customDate, setCustomDate] = useState(
    dateCondition?.operator === "between",
  );
  const [filterName, setFilterName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [payeeOperator, setPayeeOperator] = useState<string>(payeeOp);
  const [memoOperator, setMemoOperator] = useState<string>(memoOp);
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

  function handleTextFilter(
    field: "payee" | "memo",
    text: string,
    operator:
      | "contains"
      | "notContains"
      | "equals"
      | "notEquals"
      | "startsWith" = "contains",
  ) {
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
    updateConditions(field, { field, operator, value: values });
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
        <div className="relative">
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
          {dateCondition?.operator === "relative" &&
            (() => {
              const range = resolveRelativeDate(
                dateCondition as FilterCondition & {
                  field: "date";
                  operator: "relative";
                },
              );
              return (
                <p className="absolute top-full mt-0.5 text-xs text-muted-foreground whitespace-nowrap">
                  {format(parseISO(range.from), "MMM d")} –{" "}
                  {format(parseISO(range.to), "MMM d, yyyy")}
                </p>
              );
            })()}
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
                    <CommandItem
                      value="__select_all__"
                      onSelect={() => {
                        const allNames = categories.map((c) => c.name);
                        const allSelected = allNames.every((n) =>
                          selectedCategories.includes(n),
                        );
                        if (allSelected) {
                          updateConditions("categoryName", null);
                        } else {
                          updateConditions("categoryName", {
                            field: "categoryName",
                            operator: "in",
                            value: allNames,
                          });
                        }
                      }}
                    >
                      <span className="mr-2">
                        {categories.length > 0 &&
                        categories.every((c) =>
                          selectedCategories.includes(c.name),
                        )
                          ? "✓"
                          : " "}
                      </span>
                      Select all
                    </CommandItem>
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

        {/* Bank filter */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Bank
          </Label>
          <Select
            value={selectedBank || "all"}
            onValueChange={(val: string | null) => {
              if (!val || val === "all") {
                updateConditions("bankName", null);
              } else {
                updateConditions("bankName", {
                  field: "bankName",
                  operator: "equals",
                  value: val,
                });
              }
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {banks.map((b) => (
                <SelectItem key={b.id} value={b.name}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

        {/* Amount filter */}
        <div>
          <Label
            className="text-xs text-muted-foreground mb-1 block"
            title="Negative = expenses, positive = income. e.g. min -100 max 0 = expenses up to $100"
          >
            Amount min
          </Label>
          <input
            type="number"
            value={amountMin}
            onChange={(e) => {
              const val = e.target.value;
              const min = val === "" ? null : parseFloat(val);
              const max = amountMax === "" ? null : (amountMax as number);
              if (min === null && max === null) {
                updateConditions("amount", null);
              } else {
                updateConditions("amount", {
                  field: "amount",
                  operator: "between",
                  value: { min: min ?? -Infinity, max: max ?? Infinity },
                });
              }
            }}
            placeholder="e.g. -500 or 0"
            className="h-8 w-24 min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <div>
          <Label
            className="text-xs text-muted-foreground mb-1 block"
            title="Negative = expenses, positive = income. e.g. min 1000 max 5000 = income $1k-$5k"
          >
            Amount max
          </Label>
          <input
            type="number"
            value={amountMax}
            onChange={(e) => {
              const val = e.target.value;
              const max = val === "" ? null : parseFloat(val);
              const min = amountMin === "" ? null : (amountMin as number);
              if (min === null && max === null) {
                updateConditions("amount", null);
              } else {
                updateConditions("amount", {
                  field: "amount",
                  operator: "between",
                  value: { min: min ?? -Infinity, max: max ?? Infinity },
                });
              }
            }}
            placeholder="e.g. 0 or 5000"
            className="h-8 w-24 min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        {/* Payee filter */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Payee
          </Label>
          <div className="flex gap-1">
            <select
              value={payeeOperator}
              onChange={(e) => {
                const op = e.target.value as "contains" | "notContains";
                setPayeeOperator(op);
                if (payeeText) handleTextFilter("payee", payeeText, op);
              }}
              className="h-8 rounded-lg border border-input bg-transparent px-1.5 text-xs outline-none"
            >
              <option value="contains">contains</option>
              <option value="notContains">not contains</option>
              <option value="equals">equals</option>
              <option value="notEquals">not equals</option>
              <option value="startsWith">starts with</option>
            </select>
            <input
              value={payeeText}
              onChange={(e) =>
                handleTextFilter(
                  "payee",
                  e.target.value,
                  payeeOperator as "contains",
                )
              }
              placeholder="e.g. WOOLWORTHS, NEW WORLD"
              className="h-8 w-44 min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
        </div>

        {/* Memo filter */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Memo
          </Label>
          <div className="flex gap-1">
            <select
              value={memoOperator}
              onChange={(e) => {
                const op = e.target.value as "contains" | "notContains";
                setMemoOperator(op);
                if (memoText) handleTextFilter("memo", memoText, op);
              }}
              className="h-8 rounded-lg border border-input bg-transparent px-1.5 text-xs outline-none"
            >
              <option value="contains">contains</option>
              <option value="notContains">not contains</option>
              <option value="equals">equals</option>
              <option value="notEquals">not equals</option>
              <option value="startsWith">starts with</option>
            </select>
            <input
              value={memoText}
              onChange={(e) =>
                handleTextFilter(
                  "memo",
                  e.target.value,
                  memoOperator as "contains",
                )
              }
              placeholder="e.g. SALARY"
              className="h-8 w-32 min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
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
