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
      <section className="rounded-3xl border border-subtle bg-surface p-6 shadow-subtle">
        <h2 className="text-lg font-semibold text-primary">Server settings</h2>
        <p className="mt-1 text-sm text-secondary">
          Update the base URL and API key used for all requests.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.25em] text-secondary">
              Server base URL
            </span>
            <input
              className="rounded-2xl border border-subtle bg-surface px-4 py-2.5 text-sm text-primary shadow-inner focus:border-orange-400"
              value={config.baseUrl}
              onChange={(event) => updateConfig({ baseUrl: event.target.value })}
              onBlur={handleBlur}
              placeholder="https://firecrawl.local"
              autoComplete="url"
            />
            {validationMessage && (
              <span className="text-xs text-rose-500">{validationMessage}</span>
            )}
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.25em] text-secondary">
              API key (optional)
            </span>
            <input
              className="rounded-2xl border border-subtle bg-surface px-4 py-2.5 text-sm text-primary shadow-inner focus:border-orange-400"
              value={config.apiKey}
              onChange={(event) => updateConfig({ apiKey: event.target.value })}
              placeholder="fc-..."
              type="password"
              autoComplete="off"
            />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-subtle bg-surface p-6 shadow-subtle">
        <h3 className="text-lg font-semibold text-primary">Appearance</h3>
        <p className="mt-1 text-sm text-secondary">
          Choose the interface style stored locally on this device.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-secondary">
          <button
            type="button"
            onClick={() => updateConfig({ theme: "light" })}
            className={
              config.theme !== "dark"
                ? "rounded-full bg-orange-500 px-4 py-2 font-semibold text-white"
                : "rounded-full border border-subtle px-4 py-2"
            }
          >
            Light
          </button>
          <button
            type="button"
            onClick={() => updateConfig({ theme: "dark" })}
            className={
              config.theme === "dark"
                ? "rounded-full bg-slate-900 px-4 py-2 font-semibold text-white"
                : "rounded-full border border-subtle px-4 py-2"
            }
          >
            Dark
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-rose-700">Storage</h3>
        <p className="mt-1 text-sm text-rose-700/80">
          Clear all locally stored credentials and preferences. You will need to re-enter the server URL afterwards.
        </p>
        <button
          type="button"
          onClick={handleClear}
          className="mt-4 rounded-full bg-rose-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-rose-400"
        >
          Clear local storage
        </button>
      </section>
    </div>
  );
}
