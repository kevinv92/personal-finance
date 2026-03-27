"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getImportPresets,
  importCSV,
  type CSVMapperPreset,
  type ImportResult,
} from "@/lib/api";

export default function ImportsPage() {
  const { data: presets = [], isLoading } = useQuery({
    queryKey: ["importPresets"],
    queryFn: getImportPresets,
  });

  const [results, setResults] = useState<ImportResult[]>([]);

  const handleImportSuccess = useCallback((result: ImportResult) => {
    setResults((prev) => [result, ...prev]);
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Import Transactions</h2>

      <DropZone onSuccess={handleImportSuccess} />

      <h3 className="text-lg font-semibold mt-8 mb-4">
        Or drop onto a specific preset
      </h3>

      {isLoading && <p className="text-muted-foreground">Loading presets...</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {presets.map((preset) => (
          <PresetCard
            key={preset.key}
            preset={preset}
            onSuccess={handleImportSuccess}
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
    </div>
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
}: {
  preset: CSVMapperPreset;
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
      <h4 className="font-semibold">{preset.name}</h4>
      <p className="text-sm text-muted-foreground mt-1">
        {preset.bank} &middot; {accountTypeLabel[preset.accountType]}
      </p>
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
