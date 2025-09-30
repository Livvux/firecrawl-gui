"use client";

import { useMemo, useState } from "react";
import { JsonValue } from "@/domain/firecrawl";
import { cn } from "@/lib/utils";
import { ResultPane } from "./ResultPane";

interface RequestFormProps {
  title: string;
  description?: string;
  defaultValue: JsonValue;
  presets?: Array<{ label: string; body: JsonValue }>;
  onSend: (payload: JsonValue) => Promise<JsonValue>;
}

const formatJson = (value: JsonValue) => JSON.stringify(value, null, 2);

export const RequestForm = ({
  title,
  description,
  defaultValue,
  presets,
  onSend,
}: RequestFormProps) => {
  const [jsonText, setJsonText] = useState(() => formatJson(defaultValue));
  const [formError, setFormError] = useState<string | undefined>();
  const [requestError, setRequestError] = useState<string | undefined>();
  const [data, setData] = useState<JsonValue | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const presetLabels = useMemo(
    () => presets?.map((preset) => preset.label) ?? [],
    [presets],
  );

  const handlePreset = (label: string) => {
    const preset = presets?.find((entry) => entry.label === label);
    if (!preset) {
      return;
    }
    setJsonText(formatJson(preset.body));
  };

  const handleSubmit = async () => {
    setFormError(undefined);
    setRequestError(undefined);
    let parsed: JsonValue;
    try {
      parsed = JSON.parse(jsonText) as JsonValue;
    } catch {
      setFormError("Invalid JSON payload");
      return;
    }

    try {
      setIsLoading(true);
      setData(undefined);
      const result = await onSend(parsed);
      setData(result);
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow shadow-slate-950/30">
        <div className="flex flex-col gap-2">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {description && (
              <p className="text-sm text-slate-400">{description}</p>
            )}
          </div>
          {presets && presets.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs">
              {presetLabels.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handlePreset(label)}
                  className="rounded-full border border-slate-700 px-3 py-1 text-slate-300 transition hover:border-cyan-400 hover:text-white"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-3">
            <textarea
              className="h-56 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400"
              value={jsonText}
              onChange={(event) => setJsonText(event.target.value)}
              spellCheck={false}
            />
            {formError && <p className="text-xs text-rose-300">{formError}</p>}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSubmit}
                className={cn(
                  "inline-flex items-center rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition",
                  isLoading && "cursor-not-allowed opacity-70",
                )}
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send request"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <ResultPane data={data} error={requestError} isLoading={isLoading} />
    </div>
  );
};
