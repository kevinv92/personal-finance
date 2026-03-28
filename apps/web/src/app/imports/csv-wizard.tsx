"use client";

import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  previewCSV,
  testParseCSV,
  createCsvMapper,
  importCSV,
  type CsvPreviewResult,
  type TestParseResult,
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

type WizardStep = "upload" | "configure" | "map-columns" | "preview" | "done";

interface CsvWizardProps {
  onClose: () => void;
  onImportSuccess: (result: ImportResult) => void;
}

export function CsvWizard({ onClose, onImportSuccess }: CsvWizardProps) {
  const [step, setStep] = useState<WizardStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvPreviewResult | null>(null);
  const [parseResult, setParseResult] = useState<TestParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Config state
  const [name, setName] = useState("");
  const [bank, setBank] = useState("");
  const [accountType, setAccountType] = useState<
    "checking" | "savings" | "credit"
  >("checking");
  const [metaLineStart, setMetaLineStart] = useState(1);
  const [metaLineEnd, setMetaLineEnd] = useState(1);
  const [headerRow, setHeaderRow] = useState(2);
  const [dataStartRow, setDataStartRow] = useState(3);
  const [accountMetaLine, setAccountMetaLine] = useState(2);
  const [delimiter, setDelimiter] = useState(",");
  const [dateFormat, setDateFormat] = useState("");
  const [invertAmount, setInvertAmount] = useState(false);
  const [columnMap, setColumnMap] = useState<Record<string, TransactionField>>(
    {},
  );

  const handleFileUpload = useCallback(async (f: File) => {
    setFile(f);
    setError(null);
    try {
      const result = await previewCSV(f);
      setPreview(result);

      if (result.matchedMapper) {
        setError(
          `This CSV matches an existing mapper: "${result.matchedMapper.name}". Use the import drop zone instead.`,
        );
        return;
      }

      setStep("configure");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    }
  }, []);

  const buildConfig = () => ({
    name,
    bank,
    accountType,
    csvSignature: preview?.lines[accountMetaLine - 1]?.trim() ?? "",
    metaLineStart,
    metaLineEnd,
    headerRow,
    dataStartRow,
    accountMetaLine,
    delimiter: delimiter || ",",
    columnMap,
    dateFormat: dateFormat || undefined,
    invertAmount,
  });

  const handleTestParse = useCallback(async () => {
    if (!file) return;
    setError(null);
    try {
      const result = await testParseCSV(file, buildConfig());
      setParseResult(result);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Parse failed");
    }
  }, [file, buildConfig]);

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async () => {
      const config = buildConfig();
      // Create the mapper
      await createCsvMapper({
        ...config,
        delimiter: config.delimiter || null,
        dateFormat: config.dateFormat || null,
      });
      // Then import the CSV
      return importCSV(file!);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["csvMappers"] });
      queryClient.invalidateQueries({ queryKey: ["importPresets"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      onImportSuccess(result);
      setStep("done");
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "Save failed"),
  });

  // Auto-detect headers from the preview when configure step loads
  const autoDetectHeaders = useCallback(() => {
    if (!preview) return;
    const headerLine = preview.lines[headerRow - 1];
    if (!headerLine) return;

    const headers = headerLine.split(delimiter || ",").map((h) => h.trim());
    const newMap: Record<string, TransactionField> = {};

    for (const header of headers) {
      const lower = header.toLowerCase();
      if (lower.includes("date") && !lower.includes("process")) {
        newMap[header] = "date";
      } else if (lower.includes("process")) {
        newMap[header] = "dateProcessed";
      } else if (
        lower.includes("unique") ||
        lower.includes("id") ||
        lower.includes("reference")
      ) {
        newMap[header] = "externalId";
      } else if (lower.includes("type") || lower.includes("tran")) {
        newMap[header] = "type";
      } else if (
        lower.includes("payee") ||
        lower.includes("description") ||
        lower.includes("merchant")
      ) {
        newMap[header] = "payee";
      } else if (lower.includes("memo") || lower.includes("note")) {
        newMap[header] = "memo";
      } else if (lower.includes("amount") || lower.includes("value")) {
        newMap[header] = "amount";
      }
    }

    setColumnMap(newMap);
  }, [preview, headerRow, delimiter]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "New CSV Import"}
            {step === "configure" && "Step 1: Configure Structure"}
            {step === "map-columns" && "Step 2: Map Columns"}
            {step === "preview" && "Step 3: Preview Results"}
            {step === "done" && "Import Complete"}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        {step === "upload" && <UploadStep onFile={handleFileUpload} />}

        {step === "configure" && preview && (
          <ConfigureStep
            lines={preview.lines}
            name={name}
            setName={setName}
            bank={bank}
            setBank={setBank}
            accountType={accountType}
            setAccountType={setAccountType}
            metaLineStart={metaLineStart}
            setMetaLineStart={setMetaLineStart}
            metaLineEnd={metaLineEnd}
            setMetaLineEnd={setMetaLineEnd}
            headerRow={headerRow}
            setHeaderRow={setHeaderRow}
            dataStartRow={dataStartRow}
            setDataStartRow={setDataStartRow}
            accountMetaLine={accountMetaLine}
            setAccountMetaLine={setAccountMetaLine}
            delimiter={delimiter}
            setDelimiter={setDelimiter}
            dateFormat={dateFormat}
            setDateFormat={setDateFormat}
            invertAmount={invertAmount}
            setInvertAmount={setInvertAmount}
            onNext={() => {
              autoDetectHeaders();
              setStep("map-columns");
            }}
          />
        )}

        {step === "map-columns" && preview && (
          <MapColumnsStep
            lines={preview.lines}
            headerRow={headerRow}
            delimiter={delimiter}
            columnMap={columnMap}
            setColumnMap={setColumnMap}
            onBack={() => setStep("configure")}
            onNext={handleTestParse}
          />
        )}

        {step === "preview" && parseResult && (
          <PreviewStep
            result={parseResult}
            onBack={() => setStep("map-columns")}
            onSave={() => saveMutation.mutate()}
            isSaving={saveMutation.isPending}
          />
        )}

        {step === "done" && (
          <div className="text-center py-6">
            <p className="text-lg font-medium text-green-600 mb-2">
              Import successful!
            </p>
            <p className="text-muted-foreground mb-4">
              Mapper saved and transactions imported.
            </p>
            <Button onClick={onClose}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function UploadStep({ onFile }: { onFile: (file: File) => void }) {
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
        dragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50"
      }`}
    >
      <p className="text-muted-foreground mb-2">
        Drop a CSV file here that doesn&apos;t match any existing mapper
      </p>
      <label className="inline-block cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
        or click to browse
        <input
          type="file"
          accept=".csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
          className="hidden"
        />
      </label>
    </div>
  );
}

function ConfigureStep({
  lines,
  name,
  setName,
  bank,
  setBank,
  accountType,
  setAccountType,
  metaLineStart,
  setMetaLineStart,
  metaLineEnd,
  setMetaLineEnd,
  headerRow,
  setHeaderRow,
  dataStartRow,
  setDataStartRow,
  accountMetaLine,
  setAccountMetaLine,
  delimiter,
  setDelimiter,
  dateFormat,
  setDateFormat,
  invertAmount,
  setInvertAmount,
  onNext,
}: {
  lines: string[];
  name: string;
  setName: (v: string) => void;
  bank: string;
  setBank: (v: string) => void;
  accountType: "checking" | "savings" | "credit";
  setAccountType: (v: "checking" | "savings" | "credit") => void;
  metaLineStart: number;
  setMetaLineStart: (v: number) => void;
  metaLineEnd: number;
  setMetaLineEnd: (v: number) => void;
  headerRow: number;
  setHeaderRow: (v: number) => void;
  dataStartRow: number;
  setDataStartRow: (v: number) => void;
  accountMetaLine: number;
  setAccountMetaLine: (v: number) => void;
  delimiter: string;
  setDelimiter: (v: string) => void;
  dateFormat: string;
  setDateFormat: (v: string) => void;
  invertAmount: boolean;
  setInvertAmount: (v: boolean) => void;
  onNext: () => void;
}) {
  const getLineClass = (lineNum: number) => {
    if (lineNum >= metaLineStart && lineNum <= metaLineEnd) return "bg-blue-50";
    if (lineNum === headerRow) return "bg-green-50";
    if (lineNum === accountMetaLine) return "bg-yellow-50";
    if (lineNum >= dataStartRow) return "bg-gray-50";
    return "";
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden max-h-[200px] overflow-y-auto">
        <table className="w-full text-xs font-mono">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className={getLineClass(i + 1)}>
                <td className="px-2 py-0.5 text-muted-foreground text-right w-8 border-r">
                  {i + 1}
                </td>
                <td className="px-2 py-0.5 whitespace-pre">{line}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 text-xs">
        <span className="px-2 py-0.5 bg-blue-50 rounded">Meta lines</span>
        <span className="px-2 py-0.5 bg-yellow-50 rounded">Account ID</span>
        <span className="px-2 py-0.5 bg-green-50 rounded">Header row</span>
        <span className="px-2 py-0.5 bg-gray-50 rounded">Data rows</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Mapper Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. ANZ Everyday"
            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Bank</label>
          <input
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            placeholder="e.g. ANZ"
            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Account Type</label>
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
          <label className="block text-sm font-medium mb-1">Delimiter</label>
          <input
            value={delimiter}
            onChange={(e) => setDelimiter(e.target.value)}
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
            Invert amounts
          </label>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">Meta Start</label>
          <input
            type="number"
            min={1}
            value={metaLineStart}
            onChange={(e) => setMetaLineStart(parseInt(e.target.value) || 1)}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Meta End</label>
          <input
            type="number"
            min={1}
            value={metaLineEnd}
            onChange={(e) => setMetaLineEnd(parseInt(e.target.value) || 1)}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Header Row</label>
          <input
            type="number"
            min={1}
            value={headerRow}
            onChange={(e) => setHeaderRow(parseInt(e.target.value) || 1)}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Data Start</label>
          <input
            type="number"
            min={1}
            value={dataStartRow}
            onChange={(e) => setDataStartRow(parseInt(e.target.value) || 1)}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Account Line</label>
          <input
            type="number"
            min={1}
            value={accountMetaLine}
            onChange={(e) => setAccountMetaLine(parseInt(e.target.value) || 1)}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Date Format (optional)
        </label>
        <input
          value={dateFormat}
          onChange={(e) => setDateFormat(e.target.value)}
          placeholder="e.g. dd/MM/yyyy (leave empty for auto-detect)"
          className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => {}}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!name || !bank}>
          Next: Map Columns
        </Button>
      </DialogFooter>
    </div>
  );
}

function MapColumnsStep({
  lines,
  headerRow,
  delimiter,
  columnMap,
  setColumnMap,
  onBack,
  onNext,
}: {
  lines: string[];
  headerRow: number;
  delimiter: string;
  columnMap: Record<string, TransactionField>;
  setColumnMap: (map: Record<string, TransactionField>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const headerLine = lines[headerRow - 1] ?? "";
  const csvHeaders = headerLine
    .split(delimiter || ",")
    .map((h) => h.trim())
    .filter(Boolean);

  const hasRequiredFields = () => {
    const mapped = new Set(Object.values(columnMap));
    return mapped.has("date") && mapped.has("payee") && mapped.has("amount");
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Map each CSV column to a transaction field. Date, Payee, and Amount are
        required.
      </p>

      <div className="space-y-2">
        {csvHeaders.map((header) => (
          <div key={header} className="flex items-center gap-3">
            <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded min-w-[150px]">
              {header}
            </span>
            <span className="text-muted-foreground text-sm">&rarr;</span>
            <select
              value={columnMap[header] ?? ""}
              onChange={(e) => {
                const val = e.target.value as TransactionField | "";
                setColumnMap(
                  val
                    ? { ...columnMap, [header]: val }
                    : (Object.fromEntries(
                        Object.entries(columnMap).filter(([k]) => k !== header),
                      ) as Record<string, TransactionField>),
                );
              }}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            >
              <option value="">-- skip --</option>
              {TRANSACTION_FIELDS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {!hasRequiredFields() && (
        <p className="text-sm text-amber-600">
          Please map at least: Date, Payee, and Amount
        </p>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!hasRequiredFields()}>
          Test Parse
        </Button>
      </DialogFooter>
    </div>
  );
}

function PreviewStep({
  result,
  onBack,
  onSave,
  isSaving,
}: {
  result: TestParseResult;
  onBack: () => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm">
        <span>
          <strong>{result.rowCount}</strong> rows parsed
        </span>
        <span>
          <strong>{result.headers.length}</strong> columns
        </span>
        {result.accountSignature && (
          <span className="text-muted-foreground truncate">
            Account: {result.accountSignature}
          </span>
        )}
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Date</th>
              <th className="px-3 py-2 text-left font-medium">Type</th>
              <th className="px-3 py-2 text-left font-medium">Payee</th>
              <th className="px-3 py-2 text-left font-medium">Memo</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {result.sampleRows.map((row, i) => (
              <tr key={i}>
                <td className="px-3 py-1.5">{row.date}</td>
                <td className="px-3 py-1.5">{row.type}</td>
                <td className="px-3 py-1.5 max-w-[200px] truncate">
                  {row.payee}
                </td>
                <td className="px-3 py-1.5 max-w-[150px] truncate">
                  {row.memo ?? "—"}
                </td>
                <td
                  className={`px-3 py-1.5 text-right ${row.amount < 0 ? "text-red-600" : "text-green-600"}`}
                >
                  {row.amount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.sampleRows.length < result.rowCount && (
        <p className="text-xs text-muted-foreground">
          Showing {result.sampleRows.length} of {result.rowCount} rows
        </p>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Mapper & Import"}
        </Button>
      </DialogFooter>
    </div>
  );
}
