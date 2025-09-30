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
    description: "Send scrape, search, crawl, and map requests with guided forms.",
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
  const [healthUnsupported, setHealthUnsupported] = useState(false);
  const [healthNotice, setHealthNotice] = useState<string | undefined>();

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
    setHealthUnsupported(false);
    setHealthNotice(undefined);
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

      const info = response.info as Record<string, unknown> | undefined;
      const usedFallback = typeof info?.fallback === "boolean" ? (info.fallback as boolean) : false;
      setHealthUnsupported(usedFallback);

      const note = typeof info?.note === "string" ? (info.note as string) : undefined;
      setHealthNotice(note);
    } catch (error) {
      setHealth(undefined);
      if (error instanceof FirecrawlError) {
        if (error.status === 404) {
          setHealthUnsupported(true);
          setErrorMessage(undefined);
          setHealthNotice(
            "This Firecrawl build does not expose /v2/health. Try a Playground request to confirm connectivity.",
          );
          setHealth({ status: "unknown" });
        } else {
          setErrorMessage(`${error.message} (${error.status || "network"})`);
        }
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
        healthUnsupported={healthUnsupported}
        healthNotice={healthNotice}
      />

      <section className="grid gap-4 md:grid-cols-2">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-md shadow-slate-200/40 transition hover:-translate-y-1 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-slate-900 group-hover:text-orange-500">
              {link.title}
            </h3>
            <p className="mt-2 text-sm text-slate-500">{link.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
