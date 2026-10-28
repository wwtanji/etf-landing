import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";
import { UMAMI_SCRIPT_URL, UMAMI_WEBSITE_ID } from "./e2e/constants";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.E2E_PORT ?? 3100);
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  timeout: 60_000,
  expect: { timeout: 7_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    locale: "cs-CZ",
  },
  projects: [
    {
      // plan §10.1: mobile Chromium, 360×740, isMobile, hasTouch
      name: "mobile-chromium-360",
      use: {
        browserName: "chromium",
        viewport: { width: 360, height: 740 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    cwd: path.resolve(here, "../web"),
    url: `http://127.0.0.1:${PORT}/`,
    timeout: 600_000,
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      STORAGE_DRIVER: "memory",
      NEXT_PUBLIC_UMAMI_WEBSITE_ID: UMAMI_WEBSITE_ID,
      NEXT_PUBLIC_UMAMI_SCRIPT_URL: UMAMI_SCRIPT_URL,
      NEXT_PUBLIC_UMAMI_DOMAINS: "",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
