/**
 * Polyfills para compatibilidad cross-browser
 * Cargar este archivo al inicio de la aplicación
 */

// Polyfills para métodos de Array
if (!Array.prototype.at) {
  (Array.prototype as any).at = function (index: number) {
    const len = this.length;
    const relativeIndex = index < 0 ? len + index : index;
    return relativeIndex >= 0 && relativeIndex < len ? this[relativeIndex] : undefined;
  };
}

// Polyfill para String.prototype.replaceAll
if (!String.prototype.replaceAll) {
  (String.prototype as any).replaceAll = function (
    search: string | RegExp,
    replacement: string
  ): string {
    if (typeof search === 'string') {
      return this.split(search).join(replacement);
    }
    return this.replace(search as RegExp, replacement);
  };
}

// Polyfill para Object.hasOwn
if (!Object.hasOwn) {
  (Object as any).hasOwn = function (obj: object, prop: PropertyKey): boolean {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  };
}

// Polyfill para Promise.withResolvers
if (!Promise.withResolvers) {
  (Promise as any).withResolvers = function <T, E = never>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: E) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// Polyfill para Structured Clone (si no está disponible)
if (typeof structuredClone === 'undefined') {
  (globalThis as any).structuredClone = function (value: any): any {
    return JSON.parse(JSON.stringify(value));
  };
}

// Polyfill para requestIdleCallback
if (typeof window !== 'undefined' && !('requestIdleCallback' in window)) {
  (window as any).requestIdleCallback = function (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions
  ): number {
    const start = Date.now();
    return window.setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
      });
    }, 1);
  };

  (window as any).cancelIdleCallback = function (id: number): void {
    window.clearTimeout(id);
  };
}

// Polyfill para ResizeObserver
if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
  (window as any).ResizeObserver = class ResizeObserver {
    callback: ResizeObserverCallback;
    els: Map<Element, ResizeObserverEntry>;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
      this.els = new Map<Element, ResizeObserverEntry>();
    }

    observe(el: Element) {
      if (!this.els.has(el)) {
        this.els.set(el, {
          target: el,
          contentRect: el.getBoundingClientRect(),
          borderBoxSize: [] as any,
          contentBoxSize: [] as any,
          devicePixelContentBoxSize: [] as any,
        });
        // Trigger callback immediately
        this.callback(Array.from(this.els.values()), this);
      }
    }

    unobserve(el: Element) {
      this.els.delete(el);
    }

    disconnect() {
      this.els.clear();
    }
  };
}

// Polyfill para IntersectionObserver
if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
  (window as any).IntersectionObserver = class IntersectionObserver {
    callback: IntersectionObserverCallback;
    options: IntersectionObserverInit;
    els: Map<Element, IntersectionObserverEntry>;
    root: Element | null;
    rootMargin: string;
    thresholds: number[];

    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      this.callback = callback;
      this.options = options || {};
      this.els = new Map<Element, IntersectionObserverEntry>();
      this.root = null;
      this.rootMargin = '0px';
      this.thresholds = [0];
    }

    observe(el: Element) {
      if (!this.els.has(el)) {
        this.els.set(el, {
          target: el,
          isIntersecting: true,
          intersectionRatio: 1,
          time: Date.now(),
          boundingClientRect: el.getBoundingClientRect(),
          intersectionRect: el.getBoundingClientRect(),
          rootBounds: null,
        } as IntersectionObserverEntry);
        // Trigger callback immediately for simplicity
        this.callback(Array.from(this.els.values()), this);
      }
    }

    unobserve(el: Element) {
      this.els.delete(el);
    }

    disconnect() {
      this.els.clear();
    }

    takeRecords(): IntersectionObserverEntry[] {
      return Array.from(this.els.values());
    }
  };
}

// Polyfill para URLSearchParams
if (typeof window !== 'undefined' && !('URLSearchParams' in window)) {
  (window as any).URLSearchParams = class URLSearchParams {
    params: Map<string, string>;

    constructor(searchParams?: string) {
      this.params = new Map<string, string>();
      if (searchParams) {
        searchParams.split('&').forEach((pair: string) => {
          const [key, value] = pair.split('=');
          if (key) this.params.set(decodeURIComponent(key), decodeURIComponent(value || ''));
        });
      }
    }

    append(name: string, value: string) {
      this.params.set(name, value);
    }

    delete(name: string) {
      this.params.delete(name);
    }

    get(name: string): string | null {
      return this.params.get(name) || null;
    }

    getAll(name: string): string[] {
      const value = this.params.get(name);
      return value ? [value] : [];
    }

    has(name: string): boolean {
      return this.params.has(name);
    }

    set(name: string, value: string) {
      this.params.set(name, value);
    }

    sort() {
      // Sort keys alphabetically
      const sorted = new Map([...this.params.entries()].sort((a, b) => a[0].localeCompare(b[0])));
      this.params = sorted;
    }

    toString(): string {
      return Array.from(this.params.entries())
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
    }

    forEach(callback: (value: string, key: string, searchParams: this) => void) {
      this.params.forEach((value, key) => callback(value, key, this));
    }
  };
}

// Polyfill para AbortController
if (typeof window !== 'undefined' && !('AbortController' in window)) {
  (window as any).AbortController = class AbortController {
    signal: any;

    constructor() {
      this.signal = {
        aborted: false,
        onabort: null,
        reason: undefined,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
        throwIfAborted: () => {
          if (this.signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
          }
        },
      };
    }

    abort() {
      this.signal.aborted = true;
      if (this.signal.onabort) {
        this.signal.onabort();
      }
    }
  };
}

// Polyfill para Clipboard API básico
if (typeof window !== 'undefined' && !('ClipboardItem' in window)) {
  (window as any).ClipboardItem = class ClipboardItem {
    items: Record<string, Blob | string | Promise<Blob | string>>;

    constructor(items: Record<string, Blob | string | Promise<Blob | string>>) {
      this.items = items;
    }
  };
}

console.log('Polyfills cargados correctamente para compatibilidad cross-browser');
