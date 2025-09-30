"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ThemePreference = "dark" | "light";

export interface LocalConfig {
  baseUrl: string;
  apiKey: string;
  theme: ThemePreference;
}

const STORAGE_KEY = "firecrawl-config";

export const defaultConfig: LocalConfig = {
  baseUrl: "",
  apiKey: "",
  theme: "dark",
};

const isBrowser = typeof window !== "undefined";

export const validateBaseUrl = (value: string) => {
  if (!value) {
    return { valid: false, reason: "Base URL is required" } as const;
  }

  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) {
      return { valid: false, reason: "URL must use http or https" } as const;
    }
    return { valid: true } as const;
  } catch {
    return { valid: false, reason: "Invalid URL" } as const;
  }
};

const readConfig = (): LocalConfig => {
  if (!isBrowser) {
    return defaultConfig;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return defaultConfig;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<LocalConfig>;
    return {
      baseUrl: parsed.baseUrl ?? defaultConfig.baseUrl,
      apiKey: parsed.apiKey ?? defaultConfig.apiKey,
      theme: (parsed.theme === "light" ? "light" : "dark") as ThemePreference,
    };
  } catch (error) {
    console.warn("Failed to parse config from storage", error);
    return defaultConfig;
  }
};

const writeConfig = (config: LocalConfig) => {
  if (!isBrowser) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

export const useLocalConfig = () => {
  const [config, setConfig] = useState<LocalConfig>(defaultConfig);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (!isBrowser) {
      return;
    }
    setConfig(readConfig());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isBrowser || !isHydrated) {
      return;
    }
    writeConfig(config);
  }, [config, isHydrated]);

  useEffect(() => {
    if (!isBrowser || !isHydrated) {
      return;
    }
    const root = document.documentElement;
    if (config.theme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
      root.classList.remove("light");
    }
  }, [config.theme, isHydrated]);

  const updateConfig = useCallback((partial: Partial<LocalConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const clearConfig = useCallback(() => {
    setConfig(defaultConfig);
    if (isBrowser) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const normalizedBaseUrl = useMemo(() => {
    if (!config.baseUrl) {
      return "";
    }
    try {
      const url = new URL(config.baseUrl);
      url.pathname = url.pathname.replace(/\/$/, "");
      url.search = "";
      url.hash = "";
      return url.toString().replace(/\/$/, "");
    } catch {
      return config.baseUrl.trim();
    }
  }, [config.baseUrl]);

  return {
    config: { ...config, baseUrl: normalizedBaseUrl },
    setConfig,
    updateConfig,
    clearConfig,
  };
};
