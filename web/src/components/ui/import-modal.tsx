"use client";

import { AlertCircle, CheckCircle, FileJson, Info, Loader2, Upload, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

interface ImportResult {
  job_id: string;
  status: string;
  items_processed: number;
  items_total: number;
}

export function ImportHistoryModal({ isOpen, onClose, onComplete }: ImportModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [error, setError] = useState("");
  const [currentFile, setCurrentFile] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const jsonFiles = Array.from(newFiles).filter(
      (f) =>
        f.name.endsWith(".json") &&
        (f.name.startsWith("StreamingHistory") ||
          f.name.startsWith("endsong") ||
          f.name.includes("Streaming")),
    );
    if (jsonFiles.length === 0) {
      setError("Please select Spotify export files (StreamingHistory*.json or endsong*.json)");
      return;
    }
    setFiles((prev) => [...prev, ...jsonFiles]);
    setError("");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const startImport = async () => {
    if (files.length === 0) return;

    setImporting(true);
    setResults([]);
    setError("");

    for (const file of files) {
      setCurrentFile(file.name);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/v1/history/import", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.detail || `HTTP ${response.status}`);
        }

        const result: ImportResult = await response.json();
        setResults((prev) => [...prev, result]);
      } catch (err: any) {
        setError(`Failed to import ${file.name}: ${err.message}`);
        break;
      }
    }

    setImporting(false);
    setCurrentFile("");
    onComplete?.();
  };

  const reset = () => {
    setFiles([]);
    setResults([]);
    setError("");
    setCurrentFile("");
    setImporting(false);
  };

  const totalProcessed = results.reduce((sum, r) => sum + r.items_processed, 0);
  const totalItems = results.reduce((sum, r) => sum + r.items_total, 0);
  const allDone = results.length > 0 && results.length === files.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card p-6 max-w-lg w-full animate-scale-in space-y-5 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-theme flex items-center gap-2">
            <Upload className="w-5 h-5 text-accent-dynamic" /> Import Listening History
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-current/[0.05] text-theme-tertiary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions */}
        <div className="flex gap-3 p-3 rounded-xl bg-accent-dynamic/5 border border-accent-dynamic/10">
          <Info className="w-5 h-5 text-accent-dynamic flex-shrink-0 mt-0.5" />
          <div className="text-xs text-theme-secondary space-y-1">
            <p>
              <strong>How to get your data:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-0.5 text-theme-tertiary">
              <li>
                Go to{" "}
                <a
                  href="https://www.spotify.com/account/privacy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-dynamic hover:underline"
                >
                  Spotify Privacy Settings
                </a>
              </li>
              <li>
                Request &quot;Extended streaming history&quot; (recommended) or &quot;Account
                data&quot;
              </li>
              <li>Wait for the email (up to 30 days for extended data)</li>
              <li>Download and extract the ZIP file</li>
              <li>
                Upload the{" "}
                <code className="px-1 py-0.5 bg-theme-surface-3 rounded text-[10px]">
                  endsong*.json
                </code>{" "}
                or{" "}
                <code className="px-1 py-0.5 bg-theme-surface-3 rounded text-[10px]">
                  StreamingHistory*.json
                </code>{" "}
                files below
              </li>
            </ol>
          </div>
        </div>

        {/* Drop Zone */}
        {!allDone && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-current/[0.1] hover:border-accent-dynamic/30 rounded-xl p-4 sm:p-8 text-center cursor-pointer transition-colors"
          >
            <FileJson className="w-10 h-10 text-theme-tertiary mx-auto mb-3" />
            <p className="text-sm text-theme-secondary">
              Drop Spotify export files here or <span className="text-accent-dynamic">browse</span>
            </p>
            <p className="text-xs text-theme-tertiary mt-1">
              Accepts StreamingHistory*.json and endsong*.json
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file, i) => {
              const result = results[i];
              const isCurrent = currentFile === file.name;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl bg-theme-surface-2 border border-current/[0.08]"
                >
                  <FileJson
                    className={`w-5 h-5 flex-shrink-0 ${result ? "text-emerald-400" : isCurrent ? "text-accent-dynamic" : "text-theme-tertiary"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-theme truncate">{file.name}</p>
                    <p className="text-[10px] text-theme-tertiary">
                      {(file.size / 1024).toFixed(0)} KB
                      {result &&
                        ` · ${result.items_processed.toLocaleString()} of ${result.items_total.toLocaleString()} imported`}
                    </p>
                  </div>
                  {result ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 className="w-5 h-5 text-accent-dynamic animate-spin flex-shrink-0" />
                  ) : !importing ? (
                    <button
                      onClick={() => removeFile(i)}
                      className="text-theme-tertiary hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/20 bg-red-500/5">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        {/* Summary */}
        {allDone && (
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center space-y-2">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-medium text-theme">Import Complete!</p>
            <p className="text-xs text-theme-tertiary">
              {totalProcessed.toLocaleString()} new entries imported from {results.length} file
              {results.length !== 1 ? "s" : ""}
              {totalItems > 0 &&
                ` (${totalItems.toLocaleString()} total entries processed, duplicates skipped)`}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          {allDone ? (
            <>
              <button
                onClick={reset}
                className="px-4 py-2 text-sm text-theme-secondary border border-current/[0.1] rounded-xl hover:bg-current/[0.05] transition-all"
              >
                Import More
              </button>
              <button onClick={onClose} className="btn-primary text-sm">
                Done
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-theme-secondary border border-current/[0.1] rounded-xl hover:bg-current/[0.05] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={startImport}
                disabled={files.length === 0 || importing}
                className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> Import {files.length} file
                    {files.length !== 1 ? "s" : ""}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
