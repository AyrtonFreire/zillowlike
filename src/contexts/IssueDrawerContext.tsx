"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import Drawer from "@/components/ui/Drawer";

export type AppIssueSeverity = "error" | "warning" | "info";

export type AppIssue = {
  id: string;
  title: string;
  message: string;
  severity?: AppIssueSeverity;
  step?: number;
  context?: string;
  fieldId?: string;
  actionLabel?: string;
};

export type ShowIssueDrawerOptions = {
  title: string;
  message?: string;
  issues: AppIssue[];
  technical?: {
    requestId?: string;
    status?: number;
  };
  autoNavigateToFirst?: boolean;
};

type IssueDrawerContextValue = {
  showIssues: (opts: ShowIssueDrawerOptions, onGoTo?: (issue: AppIssue) => void) => void;
  closeIssues: () => void;
};

const IssueDrawerContext = createContext<IssueDrawerContextValue | null>(null);

function severityIcon(sev: AppIssueSeverity) {
  if (sev === "warning") return AlertTriangle;
  if (sev === "info") return Info;
  return AlertCircle;
}

export function IssueDrawerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ShowIssueDrawerOptions | null>(null);
  const onGoToRef = useRef<((issue: AppIssue) => void) | null>(null);

  const closeIssues = useCallback(() => {
    setOpen(false);
  }, []);

  const showIssues = useCallback((next: ShowIssueDrawerOptions, onGoTo?: (issue: AppIssue) => void) => {
    onGoToRef.current = onGoTo ?? null;
    setOpts(next);
    setOpen(true);

    const shouldAuto = next.autoNavigateToFirst !== false;
    const first = next.issues?.[0];
    if (shouldAuto && first && onGoTo) {
      try {
        onGoTo(first);
      } catch {
        // ignore
      }
    }
  }, []);

  const groups = useMemo(() => {
    const issues = opts?.issues ?? [];
    const map = new Map<string, AppIssue[]>();
    for (const it of issues) {
      const key = it.context?.trim() ? it.context.trim() : typeof it.step === "number" ? `Etapa ${it.step}` : "Geral";
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [opts]);

  const value = useMemo<IssueDrawerContextValue>(() => ({ showIssues, closeIssues }), [showIssues, closeIssues]);

  return (
    <IssueDrawerContext.Provider value={value}>
      {children}
      <Drawer open={open} onClose={closeIssues} title={opts?.title || "Problemas para corrigir"} side="right">
        {opts?.message ? <div className="text-sm text-neutral-700">{opts.message}</div> : null}

        <div className="mt-4 space-y-5">
          {groups.map(([group, issues]) => (
            <div key={group} className="space-y-2">
              <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">{group}</div>
              <div className="space-y-2">
                {issues.map((it) => {
                  const sev: AppIssueSeverity = it.severity ?? "error";
                  const Icon = severityIcon(sev);
                  const color = sev === "warning" ? "text-amber-700" : sev === "info" ? "text-blue-700" : "text-red-700";
                  const bg = sev === "warning" ? "bg-amber-50 border-amber-200" : sev === "info" ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200";
                  return (
                    <div key={it.id} className={`rounded-xl border p-3 ${bg}`}>
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 ${color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-neutral-900">{it.title}</div>
                          <div className="mt-0.5 text-sm text-neutral-700">{it.message}</div>
                          {onGoToRef.current ? (
                            <div className="mt-2">
                              <button
                                type="button"
                                className="text-sm font-semibold text-neutral-900 underline"
                                onClick={() => {
                                  const fn = onGoToRef.current;
                                  if (!fn) return;
                                  try {
                                    fn(it);
                                  } catch {
                                    // ignore
                                  }
                                }}
                              >
                                {it.actionLabel || "Ir para corrigir"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {opts?.technical?.requestId || typeof opts?.technical?.status === "number" ? (
          <details className="mt-6 rounded-xl border border-neutral-200 bg-white p-3">
            <summary className="cursor-pointer text-sm font-semibold text-neutral-900">Detalhes técnicos</summary>
            <div className="mt-2 space-y-1 text-xs text-neutral-700">
              {typeof opts?.technical?.status === "number" ? (
                <div>
                  <span className="font-semibold">Status:</span> {opts.technical.status}
                </div>
              ) : null}
              {opts?.technical?.requestId ? (
                <div>
                  <span className="font-semibold">Request ID:</span> {opts.technical.requestId}
                </div>
              ) : null}
            </div>
          </details>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800"
            onClick={closeIssues}
          >
            Entendi
          </button>
        </div>
      </Drawer>
    </IssueDrawerContext.Provider>
  );
}

export function useIssueDrawer() {
  const ctx = useContext(IssueDrawerContext);
  if (!ctx) throw new Error("useIssueDrawer must be used within IssueDrawerProvider");
  return ctx;
}
