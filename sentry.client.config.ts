import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment = process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
const release =
  process.env.NEXT_PUBLIC_SENTRY_RELEASE ||
  process.env.SENTRY_RELEASE ||
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  undefined;

const tracesSampleRate = (() => {
  const raw = process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE;
  if (raw == null || raw === "") return process.env.NODE_ENV === "production" ? 0.1 : 1.0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : process.env.NODE_ENV === "production" ? 0.1 : 1.0;
})();

const replaysOnErrorSampleRate = (() => {
  const raw = process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE;
  if (raw == null || raw === "") return 1.0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 1.0;
})();

const replaysSessionSampleRate = (() => {
  const raw = process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE;
  if (raw == null || raw === "") return 0.1;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0.1;
})();

Sentry.init({
  dsn,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  replaysOnErrorSampleRate,
  replaysSessionSampleRate,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Environment
  environment,

  release,

  // Don't send errors in development
  enabled: !!dsn && process.env.NODE_ENV !== "test",
});
