"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LOCAL_CONFIG_STORAGE_KEY } from "@/domain/config/constants";

type ThemePreference = "dark" | "light";

export interface LocalConfig {
  baseUrl: string;
  apiKey: string;
  theme: ThemePreference;
}

export const defaultConfig: LocalConfig = {
  baseUrl: "",
  apiKey: "",
  theme: "dark",
};

const isBrowser = typeof window !== "undefined";

const getSystemTheme = (): ThemePreference => {
  if (!isBrowser || typeof window.matchMedia !== "function") {
    return defaultConfig.theme;
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
};

const applyThemeToDocument = (theme: ThemePreference) => {
  if (!isBrowser) {
    return;
  }
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
};

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
  const raw = window.localStorage.getItem(LOCAL_CONFIG_STORAGE_KEY);
  if (!raw) {
    return { ...defaultConfig, theme: getSystemTheme() };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<LocalConfig>;
    const themePreference =
      parsed.theme === "light" ? "light" : parsed.theme === "dark" ? "dark" : undefined;
    return {
      baseUrl: parsed.baseUrl ?? defaultConfig.baseUrl,
      apiKey: parsed.apiKey ?? defaultConfig.apiKey,
      theme: themePreference ?? getSystemTheme(),
    };
  } catch (error) {
    console.warn("Failed to parse config from storage", error);
    return { ...defaultConfig, theme: getSystemTheme() };
  }
};

const writeConfig = (config: LocalConfig) => {
  if (!isBrowser) {
    return;
  }
  window.localStorage.setItem(LOCAL_CONFIG_STORAGE_KEY, JSON.stringify(config));
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
    if (!isHydrated) {
      return;
    }
    applyThemeToDocument(config.theme);
  }, [config.theme, isHydrated]);

  const updateConfig = useCallback((partial: Partial<LocalConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const clearConfig = useCallback(() => {
    const resetConfig = { ...defaultConfig, theme: getSystemTheme() };
    setConfig(resetConfig);
    if (isBrowser) {
      window.localStorage.removeItem(LOCAL_CONFIG_STORAGE_KEY);
    }
    applyThemeToDocument(resetConfig.theme);
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
