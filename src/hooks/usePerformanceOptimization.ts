import { useCallback, useMemo, useRef, useEffect, useState } from 'react';

// Debounce hook for performance optimization
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Throttle hook for performance optimization
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastRun = useRef(Date.now());

  return useCallback(
    ((...args) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    }) as T,
    [callback, delay]
  );
};

// Memoized selector hook for complex computations
export const useMemoizedSelector = <T, R>(
  data: T,
  selector: (data: T) => R,
  deps: React.DependencyList = []
): R => {
  return useMemo(() => selector(data), [data, ...deps]);
};

// Virtual scrolling hook for large lists
export const useVirtualScroll = (
  itemCount: number,
  itemHeight: number,
  containerHeight: number
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    itemCount
  );

  const totalHeight = itemCount * itemHeight;
  const offsetY = visibleStart * itemHeight;

  return {
    visibleStart,
    visibleEnd,
    totalHeight,
    offsetY,
    setScrollTop,
  };
};

// Intersection observer hook for lazy loading
export const useIntersectionObserver = (
  callback: () => void,
  options: IntersectionObserverInit = {}
) => {
  const targetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          callback();
        }
      },
      {
        threshold: 0.1,
        ...options,
      }
    );

    observer.observe(target);

    return () => {
      observer.unobserve(target);
    };
  }, [callback, options]);

  return targetRef;
};

// Performance monitoring hook
export const usePerformanceMonitor = (componentName: string) => {
  const renderStart = useRef<number>(0);
  const renderCount = useRef<number>(0);

  useEffect(() => {
    renderStart.current = performance.now();
    renderCount.current += 1;

    return () => {
      const renderTime = performance.now() - renderStart.current;
      if (renderTime > 16) { // More than one frame (16ms)
        console.warn(
          `Performance warning: ${componentName} render took ${renderTime.toFixed(2)}ms (render #${renderCount.current})`
        );
      }
    };
  });

  return {
    renderCount: renderCount.current,
  };
};

// Code editor optimization hook
export const useCodeEditorOptimization = () => {
  const [isOptimized, setIsOptimized] = useState(false);
  const codeCache = useRef<Map<string, any>>(new Map());
  const lastCode = useRef<string>('');

  const optimizeCode = useCallback((code: string) => {
    // Skip optimization if code hasn't changed
    if (code === lastCode.current) {
      return code;
    }

    // Check cache first
    if (codeCache.current.has(code)) {
      return codeCache.current.get(code);
    }

    // Basic optimizations
    let optimizedCode = code;
    
    // Remove excessive whitespace
    optimizedCode = optimizedCode.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Remove trailing whitespace
    optimizedCode = optimizedCode.replace(/[ \t]+$/gm, '');
    
    // Cache the result
    if (codeCache.current.size > 50) {
      // Clear cache if it gets too large
      codeCache.current.clear();
    }
    codeCache.current.set(code, optimizedCode);
    
    lastCode.current = code;
    return optimizedCode;
  }, []);

  return {
    optimizeCode,
    isOptimized,
    cacheSize: codeCache.current.size,
  };
};

// Memory usage monitoring
export const useMemoryMonitor = () => {
  const [memoryInfo, setMemoryInfo] = useState<{
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null>(null);

  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        });
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 5000);

    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
};

// Bundle size optimization hook
export const useBundleOptimization = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadTime, setLoadTime] = useState<number>(0);

  const loadComponent = useCallback(async (componentPath: string) => {
    const startTime = performance.now();
    setIsLoading(true);

    try {
      const component = await import(componentPath);
      const endTime = performance.now();
      setLoadTime(endTime - startTime);
      return component;
    } catch (error) {
      console.error('Failed to load component:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    loadComponent,
    isLoading,
    loadTime,
  };
};
