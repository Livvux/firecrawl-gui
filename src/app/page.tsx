"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ConnectionBar } from "@/components/common/ConnectionBar";
import { HealthResponse } from "@/domain/firecrawl";
import { createFirecrawlClient, FirecrawlError } from "@/io/firecrawl-client";
import { useLocalConfig, validateBaseUrl } from "@/state/useLocalConfig";

const quickLinks = [
  {
    href: "/playground",
    title: "API Playground",
    description: "Send scrape, search, crawl, and extract requests with JSON payloads.",
  },
  {
    href: "/activity",
    title: "Activity",
    description: "Monitor recent jobs and streaming logs from your Firecrawl node.",
  },
  {
    href: "/usage",
    title: "Usage",
    description: "Review quotas and credit usage if your instance exposes them.",
  },
  {
    href: "/settings",
    title: "Settings",
    description: "Update the server URL, API key, theme, or clear local storage.",
  },
];

export default function OverviewPage() {
  const { config, updateConfig } = useLocalConfig();
  const [health, setHealth] = useState<HealthResponse | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [validationMessage, setValidationMessage] = useState<string | undefined>();
  const [isChecking, setIsChecking] = useState(false);

  const client = useMemo(() => {
    if (!config.baseUrl) {
      return undefined;
    }
    return createFirecrawlClient({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
    });
  }, [config.baseUrl, config.apiKey]);

  const handleCheck = async () => {
    setErrorMessage(undefined);
    const result = validateBaseUrl(config.baseUrl);
    if (!result.valid) {
      setValidationMessage(result.reason);
      return;
    }
    setValidationMessage(undefined);

    if (!client) {
      setErrorMessage("Configure the server URL first.");
      return;
    }

    setIsChecking(true);
    try {
      const response = await client.health();
      setHealth(response);
    } catch (error) {
      setHealth(undefined);
      if (error instanceof FirecrawlError) {
        setErrorMessage(`${error.message} (${error.status || "network"})`);
      } else {
        setErrorMessage(error instanceof Error ? error.message : String(error));
      }
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <ConnectionBar
        baseUrl={config.baseUrl}
        apiKey={config.apiKey}
        onConfigChange={updateConfig}
        onCheck={handleCheck}
        isChecking={isChecking}
        validationMessage={validationMessage}
        lastHealth={health}
        errorMessage={errorMessage}
      />

      <section className="grid gap-4 md:grid-cols-2">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-2xl border border-slate-800 bg-slate-900/30 p-5 transition hover:border-cyan-400 hover:bg-slate-900/60"
          >
            <h3 className="text-lg font-semibold text-white group-hover:text-cyan-200">
              {link.title}
            </h3>
            <p className="mt-2 text-sm text-slate-400">{link.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
