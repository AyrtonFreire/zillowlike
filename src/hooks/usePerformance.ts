"use client";

import { useEffect, useCallback, useRef, useState } from "react";

// Hook para debounce
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

// Hook para throttle
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());

  const throttledCallback = useCallback((...args: Parameters<T>) => {
    if (Date.now() - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = Date.now();
    }
  }, [callback, delay]) as T;

  return throttledCallback;
}

// Hook para intersection observer
export function useIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
) {
  const observerRef = useRef<IntersectionObserver | undefined>(undefined);

  const observe = useCallback((element: Element) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(callback, {
      rootMargin: "50px",
      threshold: 0.1,
      ...options
    });

    observerRef.current.observe(element);
  }, [callback, options]);

  const disconnect = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { observe, disconnect };
}

// Hook para lazy loading de dados
export function useLazyLoad<T>(
  loadFunction: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);

    try {
      const result = await loadFunction();
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [loadFunction, loading]);

  useEffect(() => {
    load();
  }, dependencies);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { data, loading, error, reload: load };
}

// Hook para prefetch de dados
export function usePrefetch() {
  const prefetchCache = useRef<Map<string, Promise<any>>>(new Map());

  const prefetch = useCallback(async (key: string, fetchFunction: () => Promise<any>) => {
    if (prefetchCache.current.has(key)) {
      return prefetchCache.current.get(key);
    }

    const promise = fetchFunction();
    prefetchCache.current.set(key, promise);

    try {
      const result = await promise;
      return result;
    } catch (error) {
      prefetchCache.current.delete(key);
      throw error;
    }
  }, []);

  const getCached = useCallback((key: string) => {
    return prefetchCache.current.get(key);
  }, []);

  const clearCache = useCallback((key?: string) => {
    if (key) {
      prefetchCache.current.delete(key);
    } else {
      prefetchCache.current.clear();
    }
  }, []);

  return { prefetch, getCached, clearCache };
}

// Hook para otimização de scroll
export function useScrollOptimization() {
  const isScrolling = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  const onScrollStart = useCallback(() => {
    if (!isScrolling.current) {
      isScrolling.current = true;
      document.body.classList.add('is-scrolling');
    }

    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }

    scrollTimeout.current = setTimeout(() => {
      isScrolling.current = false;
      document.body.classList.remove('is-scrolling');
    }, 150);
  }, []);

  useEffect(() => {
    const handleScroll = useThrottle(onScrollStart, 16); // ~60fps

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, [onScrollStart]);

  return { isScrolling: isScrolling.current };
}

// Hook para performance monitoring
export function usePerformanceMonitor() {
  const metricsRef = useRef<{
    renderCount: number;
    lastRenderTime: number;
    averageRenderTime: number;
  }>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0
  });

  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      metricsRef.current.renderCount++;
      metricsRef.current.lastRenderTime = renderTime;
      metricsRef.current.averageRenderTime = 
        (metricsRef.current.averageRenderTime * (metricsRef.current.renderCount - 1) + renderTime) / 
        metricsRef.current.renderCount;

      // Log slow renders in development
      if (process.env.NODE_ENV === 'development' && renderTime > 16) {
        console.warn(`Slow render detected: ${renderTime.toFixed(2)}ms`);
      }
    };
  });

  const getMetrics = useCallback(() => metricsRef.current, []);

  return { getMetrics };
}
