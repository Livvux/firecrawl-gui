"use client";

import { useState } from "react";
import { useLocalConfig, validateBaseUrl } from "@/state/useLocalConfig";

export default function SettingsPage() {
  const { config, updateConfig, clearConfig } = useLocalConfig();
  const [validationMessage, setValidationMessage] = useState<string | undefined>();

  const handleBlur = () => {
    const result = validateBaseUrl(config.baseUrl);
    setValidationMessage(result.valid ? undefined : result.reason);
  };

  const handleClear = () => {
    clearConfig();
    setValidationMessage(undefined);
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold text-white">Server settings</h2>
        <p className="mt-1 text-sm text-slate-400">
          Update the base URL and API key used for all requests.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Server base URL
            </span>
            <input
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-400"
              value={config.baseUrl}
              onChange={(event) => updateConfig({ baseUrl: event.target.value })}
              onBlur={handleBlur}
              placeholder="https://firecrawl.local"
              autoComplete="url"
            />
            {validationMessage && (
              <span className="text-xs text-rose-400">{validationMessage}</span>
            )}
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              API key (optional)
            </span>
            <input
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-400"
              value={config.apiKey}
              onChange={(event) => updateConfig({ apiKey: event.target.value })}
              placeholder="fc-..."
              type="password"
              autoComplete="off"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold text-white">Appearance</h3>
        <p className="mt-1 text-sm text-slate-400">
          Dark mode is the default. Switch to light if you prefer higher contrast.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-200">
          <button
            type="button"
            onClick={() => updateConfig({ theme: "dark" })}
            className={
              config.theme === "dark"
                ? "rounded-full bg-cyan-500 px-4 py-2 font-semibold text-slate-900"
                : "rounded-full border border-slate-700 px-4 py-2 text-slate-200"
            }
          >
            Dark
          </button>
          <button
            type="button"
            onClick={() => updateConfig({ theme: "light" })}
            className={
              config.theme === "light"
                ? "rounded-full bg-cyan-500 px-4 py-2 font-semibold text-slate-900"
                : "rounded-full border border-slate-700 px-4 py-2 text-slate-200"
            }
          >
            Light
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-rose-500/60 bg-rose-500/10 p-6">
        <h3 className="text-lg font-semibold text-rose-100">Storage</h3>
        <p className="mt-1 text-sm text-rose-100/80">
          Clear all locally stored credentials and preferences. You will need to
          re-enter the server URL afterwards.
        </p>
        <button
          type="button"
          onClick={handleClear}
          className="mt-4 rounded-md bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400"
        >
          Clear local storage
        </button>
      </section>
    </div>
  );
}
