"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { StudentSetup, ScheduleItem } from "@/types/routine";
import { generateShareUrl } from "@/lib/routine/shareUrl";
import { getScheduleHeadline } from "@/lib/routine/schedule";
import {
  ShareIcon,
  CopyIcon,
  CheckIcon,
  XIcon,
} from "@/components/ui/Icons";

interface ShareModalProps {
  setup: StudentSetup;
  items: ScheduleItem[];
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareModal({
  setup,
  items,
  isOpen,
  onClose,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [canWebShare] = useState<boolean>(() => {
    return typeof navigator !== "undefined" && typeof navigator.share === "function";
  });

  const headline = getScheduleHeadline(setup, items);
  const shareUrl = typeof window !== "undefined" ? generateShareUrl(setup) : "";

  // Generate QR Code data URL dynamically
  useEffect(() => {
    if (!isOpen || !shareUrl) return;

    let isCancelled = false;
    QRCode.toDataURL(shareUrl, {
      width: 280,
      margin: 1.5,
      color: {
        dark: "#09090b",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (!isCancelled) {
          setQrDataUrl(url);
        }
      })
      .catch((err) => {
        console.error("Failed to generate QR code:", err);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, shareUrl]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement("input");
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }

      setCopied(true);
      toast.success("Share link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Copy failed:", err);
      toast.error("Failed to copy link. Please select and copy manually.");
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: `RoutineKit · ${headline}`,
        text: `Here is my DIU CSE timetable (${headline}) on RoutineKit:`,
        url: shareUrl,
      });
      toast.success("Shared successfully!");
    } catch (err: unknown) {
      if ((err as Error)?.name !== "AbortError") {
        console.error("Share failed:", err);
        handleCopy();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs overscroll-contain transition-opacity">
      <div className="bg-[var(--surface-card)] border-t sm:border border-[var(--surface-border)] rounded-t-2xl sm:rounded-2xl w-full max-w-md flex flex-col shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        {/* Mobile Drag Handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0 cursor-grab">
          <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[var(--surface-border)] flex items-start justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <h2 className="text-base font-bold font-sans text-[var(--ink-primary)] tracking-tight flex items-center gap-2">
              <ShareIcon className="w-4 h-4 text-[var(--ink-secondary)] shrink-0" />
              <span>Share Timetable</span>
            </h2>
            <p className="text-xs text-[var(--ink-secondary)] truncate">
              {headline} · {items.length} {items.length === 1 ? "class" : "classes"} / week
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[var(--surface-elevated)] border border-[var(--surface-border)] flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-ground)] transition-all cursor-pointer active:scale-95 shrink-0"
            aria-label="Close"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-5 space-y-4">
          {/* Share Link Field with 1-Click Copy */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[var(--ink-muted)] uppercase tracking-wider block">
              1-Click Share Link
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-[var(--surface-elevated)] border border-[var(--surface-border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--ink-primary)] truncate select-all">
                {shareUrl}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0 shadow-2xs ${
                  copied
                    ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 border-zinc-950 dark:border-zinc-100"
                    : "bg-[var(--surface-elevated)] hover:bg-[var(--surface-muted)] text-[var(--ink-primary)] border-[var(--surface-border)] hover:border-[var(--brand-border)]"
                }`}
                title="Copy share link to clipboard"
              >
                {copied ? (
                  <>
                    <CheckIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <CopyIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Native Web Share Button (if supported on mobile/tablet) */}
          {canWebShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-semibold rounded-xl active:scale-95 shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <ShareIcon className="w-3.5 h-3.5 shrink-0" />
              <span>Share via WhatsApp, Messages, or Apps</span>
            </button>
          )}

          {/* QR Code Container */}
          <div className="p-4 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-elevated)]/50 flex flex-col items-center justify-center text-center space-y-2.5">
            {qrDataUrl ? (
              <div className="p-2.5 bg-white rounded-xl shadow-2xs border border-zinc-200 dark:border-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt={`QR code for ${headline}`}
                  className="w-36 h-36 object-contain block"
                />
              </div>
            ) : (
              <div className="w-36 h-36 bg-[var(--surface-ground)] animate-pulse rounded-xl" />
            )}
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-[var(--ink-primary)] block">
                Instant Mobile Scan
              </span>
              <p className="text-[11px] text-[var(--ink-muted)] max-w-xs leading-normal">
                Scan with any phone camera to instantly open and save this timetable.
              </p>
            </div>
          </div>

          {/* Privacy Note */}
          <p className="text-[10.5px] text-[var(--ink-faint)] text-center leading-relaxed">
            Shared links contain only cohort and course selections. No personal data or accounts required.
          </p>
        </div>
      </div>
    </div>
  );
}
