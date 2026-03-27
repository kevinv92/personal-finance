"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getImportPresets,
  getCsvMappers,
  createCsvMapper,
  updateCsvMapper,
  deleteCsvMapper,
  importCSV,
  type CSVMapperPreset,
  type CsvMapper,
  type TransactionField,
  type ImportResult,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const TRANSACTION_FIELDS: { value: TransactionField; label: string }[] = [
  { value: "date", label: "Date" },
  { value: "dateProcessed", label: "Date Processed" },
  { value: "externalId", label: "External ID" },
  { value: "type", label: "Transaction Type" },
  { value: "payee", label: "Payee" },
  { value: "memo", label: "Memo" },
  { value: "amount", label: "Amount" },
];

export default function ImportsPage() {
  const { data: presets = [], isLoading: presetsLoading } = useQuery({
    queryKey: ["importPresets"],
    queryFn: getImportPresets,
  });

  const { data: mappers = [], isLoading: mappersLoading } = useQuery({
    queryKey: ["csvMappers"],
    queryFn: getCsvMappers,
  });

  const [results, setResults] = useState<ImportResult[]>([]);
  const [editMapper, setEditMapper] = useState<CsvMapper | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const handleImportSuccess = useCallback((result: ImportResult) => {
    setResults((prev) => [result, ...prev]);
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Import Transactions</h2>

      <DropZone onSuccess={handleImportSuccess} />

      <h3 className="text-lg font-semibold mt-8 mb-4">
        Or drop onto a specific mapper
      </h3>

      {presetsLoading && <p className="text-muted-foreground">Loading...</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {presets.map((preset) => (
          <PresetCard
            key={preset.key}
            preset={preset}
            onSuccess={handleImportSuccess}
            onEdit={() => {
              const mapper = mappers.find((m) => m.id === preset.key);
              if (mapper) setEditMapper(mapper);
            }}
          />
        ))}
      </div>

      {results.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Import History</h3>
          <div className="space-y-3">
            {results.map((result, i) => (
              <ImportResultCard key={i} result={result} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">CSV Mapper Configurations</h3>
          <Button onClick={() => setShowCreate(true)}>New Mapper</Button>
        </div>

        {mappersLoading && <p className="text-muted-foreground">Loading...</p>}

        {mappers.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Bank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Columns Mapped
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {mappers.map((mapper) => (
                  <MapperRow
                    key={mapper.id}
                    mapper={mapper}
                    onEdit={() => setEditMapper(mapper)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(editMapper || showCreate) && (
        <MapperDialog
          mapper={editMapper}
          onClose={() => {
            setEditMapper(null);
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

function MapperRow({
  mapper,
  onEdit,
}: {
  mapper: CsvMapper;
  onEdit: () => void;
}) {
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: () => deleteCsvMapper(mapper.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["csvMappers"] });
      queryClient.invalidateQueries({ queryKey: ["importPresets"] });
    },
  });

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 text-sm font-medium">{mapper.name}</td>
      <td className="px-6 py-4 text-sm text-gray-500">{mapper.bank}</td>
      <td className="px-6 py-4 text-sm text-gray-500">{mapper.accountType}</td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {Object.keys(mapper.columnMap).length}
      </td>
      <td className="px-6 py-4 text-sm text-right space-x-2">
        <button
          onClick={onEdit}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          Edit
        </button>
        <button
          onClick={() => {
            if (confirm(`Delete "${mapper.name}"?`)) {
              deleteMutation.mutate();
            }
          }}
          disabled={deleteMutation.isPending}
          className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}

function MapperDialog({
  mapper,
  onClose,
}: {
  mapper: CsvMapper | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!mapper;

  const [name, setName] = useState(mapper?.name ?? "");
  const [bank, setBank] = useState(mapper?.bank ?? "");
  const [accountType, setAccountType] = useState<
    "checking" | "savings" | "credit"
  >(mapper?.accountType ?? "checking");
  const [csvSignature, setCsvSignature] = useState(mapper?.csvSignature ?? "");
  const [metaLineStart, setMetaLineStart] = useState(
    mapper?.metaLineStart ?? 1,
  );
  const [metaLineEnd, setMetaLineEnd] = useState(mapper?.metaLineEnd ?? 1);
  const [headerRow, setHeaderRow] = useState(mapper?.headerRow ?? 2);
  const [dataStartRow, setDataStartRow] = useState(mapper?.dataStartRow ?? 3);
  const [accountMetaLine, setAccountMetaLine] = useState(
    mapper?.accountMetaLine ?? 1,
  );
  const [delimiter, setDelimiter] = useState(mapper?.delimiter ?? ",");
  const [dateFormat, setDateFormat] = useState(mapper?.dateFormat ?? "");
  const [invertAmount, setInvertAmount] = useState(
    mapper?.invertAmount ?? false,
  );
  const [columnMap, setColumnMap] = useState<Record<string, TransactionField>>(
    mapper?.columnMap ?? {},
  );
  const [newCsvHeader, setNewCsvHeader] = useState("");

  const createMutation = useMutation({
    mutationFn: createCsvMapper,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["csvMappers"] });
      queryClient.invalidateQueries({ queryKey: ["importPresets"] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Omit<CsvMapper, "id" | "createdAt">) =>
      updateCsvMapper(mapper!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["csvMappers"] });
      queryClient.invalidateQueries({ queryKey: ["importPresets"] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = {
      name,
      bank,
      accountType,
      csvSignature,
      metaLineStart,
      metaLineEnd,
      headerRow,
      dataStartRow,
      accountMetaLine,
      delimiter: delimiter || null,
      columnMap,
      dateFormat: dateFormat || null,
      invertAmount,
    };

    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const addColumnMapping = () => {
    if (newCsvHeader.trim()) {
      setColumnMap((prev) => ({
        ...prev,
        [newCsvHeader.trim()]: "payee",
      }));
      setNewCsvHeader("");
    }
  };

  const removeColumnMapping = (csvHeader: string) => {
    setColumnMap((prev) => {
      const next = { ...prev };
      delete next[csvHeader];
      return next;
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Edit: ${mapper.name}` : "New CSV Mapper"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bank</label>
              <input
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                required
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Account Type
              </label>
              <select
                value={accountType}
                onChange={(e) =>
                  setAccountType(
                    e.target.value as "checking" | "savings" | "credit",
                  )
                }
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
                <option value="credit">Credit Card</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Delimiter
              </label>
              <input
                value={delimiter}
                onChange={(e) => setDelimiter(e.target.value)}
                placeholder=","
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              CSV Signature (account meta line content)
            </label>
            <input
              value={csvSignature}
              onChange={(e) => setCsvSignature(e.target.value)}
              required
              placeholder="e.g. Bank 12; Branch 3162; Account 0156490-50 (Streamline)"
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Meta Lines Start
              </label>
              <input
                type="number"
                min={1}
                value={metaLineStart}
                onChange={(e) =>
                  setMetaLineStart(parseInt(e.target.value) || 1)
                }
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Meta Lines End
              </label>
              <input
                type="number"
                min={1}
                value={metaLineEnd}
                onChange={(e) => setMetaLineEnd(parseInt(e.target.value) || 1)}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Header Row
              </label>
              <input
                type="number"
                min={1}
                value={headerRow}
                onChange={(e) => setHeaderRow(parseInt(e.target.value) || 1)}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Data Start Row
              </label>
              <input
                type="number"
                min={1}
                value={dataStartRow}
                onChange={(e) => setDataStartRow(parseInt(e.target.value) || 1)}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Account Meta Line
              </label>
              <input
                type="number"
                min={1}
                value={accountMetaLine}
                onChange={(e) =>
                  setAccountMetaLine(parseInt(e.target.value) || 1)
                }
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Date Format (optional)
              </label>
              <input
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                placeholder="e.g. dd/MM/yyyy (auto-detect if empty)"
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={invertAmount}
                  onChange={(e) => setInvertAmount(e.target.checked)}
                />
                Invert amounts (credit cards)
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Column Mapping
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Map CSV header names to transaction fields
            </p>

            {Object.entries(columnMap).map(([csvHeader, field]) => (
              <div key={csvHeader} className="flex items-center gap-2 mb-2">
                <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded min-w-[120px]">
                  {csvHeader}
                </span>
                <span className="text-muted-foreground text-sm">&rarr;</span>
                <select
                  value={field}
                  onChange={(e) =>
                    setColumnMap((prev) => ({
                      ...prev,
                      [csvHeader]: e.target.value as TransactionField,
                    }))
                  }
                  className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                >
                  {TRANSACTION_FIELDS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeColumnMapping(csvHeader)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  remove
                </button>
              </div>
            ))}

            <div className="flex items-center gap-2 mt-2">
              <input
                value={newCsvHeader}
                onChange={(e) => setNewCsvHeader(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addColumnMapping();
                  }
                }}
                placeholder="CSV column header name"
                className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2 text-sm outline-none"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addColumnMapping}
              >
                Add
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isEdit ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DropZone({
  onSuccess,
}: {
  onSuccess: (result: ImportResult) => void;
}) {
  const queryClient = useQueryClient();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: importCSV,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      onSuccess(result);
      setError(null);
    },
    onError: (err) => setError(err.message),
  });

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".csv")) {
        mutation.mutate(file);
      } else {
        setError("Please drop a .csv file");
      }
    },
    [mutation],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        mutation.mutate(file);
      }
      e.target.value = "";
    },
    [mutation],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        dragging
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300 bg-gray-50 hover:border-gray-400"
      }`}
    >
      <p className="text-muted-foreground mb-2">
        {mutation.isPending
          ? "Importing..."
          : "Drop a CSV file here to auto-detect and import"}
      </p>
      <label className="inline-block cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
        or click to browse
        <input
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="hidden"
        />
      </label>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
}

function PresetCard({
  preset,
  onSuccess,
  onEdit,
}: {
  preset: CSVMapperPreset;
  onSuccess: (result: ImportResult) => void;
  onEdit: () => void;
}) {
  const queryClient = useQueryClient();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: importCSV,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      onSuccess(result);
      setError(null);
    },
    onError: (err) => setError(err.message),
  });

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".csv")) {
        mutation.mutate(file);
      } else {
        setError("Please drop a .csv file");
      }
    },
    [mutation],
  );

  const accountTypeLabel: Record<string, string> = {
    checking: "Checking",
    savings: "Savings",
    credit: "Credit Card",
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`border-2 rounded-lg p-4 transition-colors ${
        dragging
          ? "border-blue-500 bg-blue-50"
          : mutation.isPending
            ? "border-yellow-400 bg-yellow-50"
            : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-semibold">{preset.name}</h4>
          <p className="text-sm text-muted-foreground mt-1">
            {preset.bank} &middot; {accountTypeLabel[preset.accountType]}
          </p>
        </div>
        <button
          onClick={onEdit}
          className="text-muted-foreground hover:text-foreground text-xs"
          title="Edit mapper"
        >
          &#9881;
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-2 truncate">
        {preset.csvSignature}
      </p>
      {mutation.isPending && (
        <p className="text-sm text-yellow-600 mt-2">Importing...</p>
      )}
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}

function ImportResultCard({ result }: { result: ImportResult }) {
  return (
    <div className="bg-white border rounded-lg p-4 flex items-center justify-between">
      <div>
        <span className="font-medium">{result.preset}</span>
        <span className="text-muted-foreground ml-2">{result.bank}</span>
      </div>
      <div className="flex gap-4 text-sm">
        <span className="text-green-600 font-medium">
          {result.imported} imported
        </span>
        {result.skipped > 0 && (
          <span className="text-muted-foreground">
            {result.skipped} skipped
          </span>
        )}
        {result.categorised > 0 && (
          <span className="text-blue-600">
            {result.categorised} categorised
          </span>
        )}
        <span className="text-muted-foreground">{result.total} total</span>
      </div>
    </div>
  );
}
