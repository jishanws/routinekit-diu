"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { StudentSetup } from "@/types/routine";
import { validateSetupSchema, exportSetupToFile, forgetSetup } from "@/lib/storage/setupStore";
import { TransferIcon, DownloadIcon, AlertCircleIcon, CheckIcon, XIcon } from "@/components/ui/Icons";

interface ImportExportModalProps {
  currentSetup: StudentSetup;
  isOpen: boolean;
  onClose: () => void;
  onImport: (importedSetup: StudentSetup) => void;
  onReset: () => void;
}

export default function ImportExportModal({
  currentSetup,
  isOpen,
  onClose,
  onImport,
  onReset,
}: ImportExportModalProps) {
  const [importPreview, setImportPreview] = useState<StudentSetup | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importedRawName, setImportedRawName] = useState<string>("");

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportedRawName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        const { isValid, errors, setup } = validateSetupSchema(parsed);

        if (!isValid || !setup) {
          setImportErrors(errors);
          setImportPreview(null);
        } else {
          setImportErrors([]);
          setImportPreview(setup);
          toast.success("File validated successfully");
        }
      } catch {
        setImportErrors(["Uploaded file is not valid JSON."]);
        setImportPreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (importPreview) {
      onImport(importPreview);
      toast.success("Successfully imported routine configuration");
      onClose();
    }
  };

  const handleForget = () => {
    if (confirm("Are you sure you want to clear your saved setup from this browser?")) {
      forgetSetup();
      onReset();
      toast.info("Cleared routine configuration");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm sm:backdrop-blur-xs overscroll-contain transition-opacity">
      <div className="bg-[var(--surface-card)] border-t sm:border border-[var(--surface-border)] rounded-t-[28px] sm:rounded-2xl w-full max-w-xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-250">
        {/* Mobile Tactile Drag Handle */}
        <div className="sm:hidden pt-3 pb-1.5 flex justify-center shrink-0 cursor-grab">
          <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 sm:px-6 py-3 sm:py-4 border-b border-[var(--surface-border)] flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-xl font-bold font-mono text-[var(--ink-primary)] tracking-tight">
              Transfer &amp; Backup Setup
            </h2>
            <p className="text-xs text-[var(--ink-secondary)]">
              Move your configured routine between devices or save a local JSON backup.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--surface-elevated)] border border-[var(--surface-border)] flex items-center justify-center text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-ground)] transition-all cursor-pointer active:scale-95 shadow-2xs"
            aria-label="Close"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 sm:px-6 py-4 sm:py-5 overflow-y-auto space-y-4 flex-1">
          {/* Section 1: Export */}
          <div className="p-4 bg-[var(--surface-ground)] rounded-xl border border-[var(--surface-border)] space-y-2.5 shadow-2xs">
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
                Export Current Setup Backup
              </h3>
              <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                Download your configured batch, sections, and retake choices as a portable JSON file.
              </p>
            </div>
            
            <button
              type="button"
              onClick={() => {
                exportSetupToFile(currentSetup);
                toast.success("Downloaded setup backup JSON");
              }}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] active:scale-95 border border-[var(--surface-border)] text-xs font-semibold rounded-xl text-[var(--ink-primary)] shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <DownloadIcon className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" />
              <span>Download Setup JSON</span>
            </button>
          </div>

          {/* Section 2: Import */}
          <div className="p-4 bg-[var(--surface-ground)] rounded-xl border border-[var(--surface-border)] space-y-3 shadow-2xs">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-[var(--ink-primary)]">
                Import Setup from Another Device
              </h3>
              <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                Upload a RoutineKit JSON setup file exported from another browser or device.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] active:scale-95 border border-[var(--surface-border)] text-xs font-semibold rounded-xl text-[var(--ink-primary)] shadow-2xs transition-all cursor-pointer inline-flex items-center justify-center gap-1.5">
                <TransferIcon className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" />
                <span>Select JSON File</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {importedRawName && (
                <span className="text-xs font-mono text-[var(--ink-muted)] truncate max-w-xs text-center sm:text-left">
                  {importedRawName}
                </span>
              )}
            </div>

            {/* Import Errors */}
            {importErrors.length > 0 && (
              <div className="p-3 bg-[var(--status-conflict-surface)] border border-[var(--status-conflict-border)] rounded-lg text-xs text-[var(--status-conflict)] space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertCircleIcon className="w-3.5 h-3.5" />
                  <span>Validation Error</span>
                </div>
                {importErrors.map((err, i) => (
                  <p key={i} className="font-mono text-[11px] pl-5">• {err}</p>
                ))}
              </div>
            )}

            {/* Import Preview */}
            {importPreview && (
              <div className="p-3.5 bg-[var(--brand-surface)]/60 border border-[var(--brand-border)] rounded-lg space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[var(--brand-primary)]">
                  <CheckIcon className="w-3.5 h-3.5" />
                  <span>Valid Setup File Detected</span>
                </div>
                <div className="text-[11px] font-mono text-[var(--ink-secondary)] space-y-0.5 pl-5">
                  <p>Batch: {importPreview.batch || "None"}</p>
                  <p>Section: {importPreview.section || "None"}</p>
                  <p>Total Courses: {importPreview.courses.length}</p>
                </div>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="mt-2 w-full py-2 bg-[var(--brand-primary)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--brand-primary-hover)] transition-colors shadow-2xs cursor-pointer"
                >
                  Apply &amp; Replace Current Routine
                </button>
              </div>
            )}
          </div>

          {/* Section 3: Reset / Forget */}
          <div className="pt-2 flex items-center justify-between text-xs border-t border-[var(--surface-border-subtle)]">
            <span className="text-[var(--ink-muted)]">Clear local browser storage:</span>
            <button
              type="button"
              onClick={handleForget}
              className="text-xs text-[var(--status-conflict)] hover:underline font-medium cursor-pointer"
            >
              Reset Saved Setup
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] sm:pb-3.5 border-t border-[var(--surface-border)] bg-[var(--surface-elevated)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 text-xs font-semibold text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] bg-[var(--surface-card)] border border-[var(--surface-border)] rounded-xl cursor-pointer transition-colors text-center"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
