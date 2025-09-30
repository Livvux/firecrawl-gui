"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UsePollingOptions<T> {
  autoStart?: boolean;
  onError?: (error: unknown) => void;
  transform?: (value: T) => T;
}

interface PollingState<T> {
  data?: T;
  error?: Error;
  isLoading: boolean;
  isActive: boolean;
  start: () => void;
  stop: () => void;
}

export const usePolling = <T,>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  intervalMs: number,
  options: UsePollingOptions<T> = {},
): PollingState<T> => {
  const { autoStart = true, onError, transform } = options;
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<Error | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(autoStart);
  const [isActive, setIsActive] = useState<boolean>(autoStart);

  const isActiveRef = useRef<boolean>(autoStart);
  const controllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onErrorRef = useRef<typeof onError>(undefined);
  const transformRef = useRef<typeof transform>(undefined);

  onErrorRef.current = onError;
  transformRef.current = transform;

  const clearController = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  const stop = useCallback(() => {
    if (!isActiveRef.current && !controllerRef.current) {
      return;
    }
    isActiveRef.current = false;
    setIsActive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    clearController();
    setIsLoading(false);
  }, [clearController]);

  const execute = useCallback(async () => {
    clearController();
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsLoading(true);
    try {
      const result = await fetcher(controller.signal);
      const mapper = transformRef.current;
      setData(mapper ? mapper(result) : result);
      setError(undefined);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return;
      }
      const errorObject = err instanceof Error ? err : new Error(String(err));
      setError(errorObject);
      const handler = onErrorRef.current;
      handler?.(errorObject);
    } finally {
      setIsLoading(false);
    }
  }, [clearController, fetcher]);

  const start = useCallback(() => {
    if (!isActiveRef.current) {
      isActiveRef.current = true;
      setIsActive(true);
    }
    execute();
    if (!intervalRef.current) {
      intervalRef.current = setInterval(execute, intervalMs);
    }
  }, [execute, intervalMs]);

  useEffect(() => {
    if (!autoStart) {
      return;
    }
    start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    data,
    error,
    isLoading,
    isActive,
    start,
    stop,
  };
};
