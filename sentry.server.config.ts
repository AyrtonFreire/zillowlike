import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;
const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
const release =
  process.env.SENTRY_RELEASE ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  undefined;

const tracesSampleRate = (() => {
  const raw = process.env.SENTRY_TRACES_SAMPLE_RATE;
  if (raw == null || raw === "") return process.env.NODE_ENV === "production" ? 0.1 : 1.0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : process.env.NODE_ENV === "production" ? 0.1 : 1.0;
})();

Sentry.init({
  dsn,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Environment
  environment,

  release,

  // Don't send errors in development
  enabled: !!dsn && process.env.NODE_ENV !== "test",

  // Capture console errors
  integrations: [
    Sentry.captureConsoleIntegration({
      levels: ["error"],
    }),
  ],
});
