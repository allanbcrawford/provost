import * as Sentry from "@sentry/nextjs";

const PII_PATTERN = /\b(\d{3}-\d{2}-\d{4}|\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/g;

function redactPii(value: string): string {
  return value.replace(PII_PATTERN, "[REDACTED]");
}

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    debug: false,
    beforeSend(event) {
      if (event.message) {
        event.message = redactPii(event.message);
      }
      if (event.breadcrumbs) {
        for (const crumb of event.breadcrumbs) {
          if (crumb.message) {
            crumb.message = redactPii(crumb.message);
          }
        }
      }
      return event;
    },
  });
}
