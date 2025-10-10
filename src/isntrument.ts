import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: true,
  integrations: [
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: 0.7,
  profilesSampleRate: 0.7,
  enableLogs: true,
});