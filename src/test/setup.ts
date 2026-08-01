import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./msw";

// Node 24 injects an experimental global `localStorage` that shadows jsdom's and
// throws unless `--localstorage-file` is set. Install a simple Map-backed store so
// the client's localStorage reads/writes work deterministically in tests.
function installLocalStorage() {
  const store = new Map<string, string>();
  const mock: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k) => (store.has(k) ? store.get(k)! : null),
    key: (i) => Array.from(store.keys())[i] ?? null,
    removeItem: (k) => void store.delete(k),
    setItem: (k, v) => void store.set(k, String(v)),
  };
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: mock,
  });
}

// Base URL used by the API client in tests (localStorage-backed).
beforeAll(() => {
  installLocalStorage();
  localStorage.setItem("api_base_url", "http://soul.test");
  localStorage.setItem("access_token", "test-token");
  server.listen({ onUnhandledRequest: "error" });
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
