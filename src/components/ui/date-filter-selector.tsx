"use client";

import * as React from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { DateRangePreset } from "@/lib/date-utils";

interface DateFilterSelectorProps {
  value: DateRangePreset;
  customStartDate?: string;
  customEndDate?: string;
  onChange: (preset: DateRangePreset, customStart?: string, customEnd?: string) => void;
  className?: string;
}

export function DateFilterSelector({
  value,
  customStartDate,
  customEndDate,
  onChange,
  className = "",
}: DateFilterSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showCustomModal, setShowCustomModal] = React.useState(false);
  const [startInput, setStartInput] = React.useState(customStartDate || "");
  const [endInput, setEndInput] = React.useState(customEndDate || "");
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const presets: { key: DateRangePreset; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "thisWeek", label: "This Week" },
    { key: "thisMonth", label: "This Month" },
    { key: "previousMonth", label: "Previous Month" },
    { key: "custom", label: "Custom Date Range..." },
  ];

  const currentLabel =
    value === "custom" && customStartDate && customEndDate
      ? `${customStartDate} to ${customEndDate}`
      : presets.find((p) => p.key === value)?.label || "This Month";

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (key: DateRangePreset) => {
    if (key === "custom") {
      setShowCustomModal(true);
      setIsOpen(false);
    } else {
      onChange(key);
      setIsOpen(false);
    }
  };

  const applyCustom = () => {
    if (startInput && endInput) {
      onChange("custom", startInput, endInput);
      setShowCustomModal(false);
    }
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-colors"
      >
        <Calendar className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
        <span>{currentLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg py-1 z-30">
          {presets.map((p) => (
            <button
              key={p.key}
              onClick={() => handleSelect(p.key)}
              className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between ${
                value === p.key
                  ? "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 font-semibold"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <span>{p.label}</span>
              {value === p.key && <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />}
            </button>
          ))}
        </div>
      )}

      {/* Custom Date Range Dialog */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-5 space-y-4">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
              Select Custom Date Range
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startInput}
                  onChange={(e) => setStartInput(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endInput}
                  onChange={(e) => setEndInput(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!startInput || !endInput}
                onClick={applyCustom}
                className="px-4 py-1.5 text-xs font-medium bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
