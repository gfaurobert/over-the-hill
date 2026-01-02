interface DebugIngestEvent {
  location: string;
  message: string;
  data?: unknown;
  timestamp?: number;
  sessionId?: string;
  runId?: string;
  hypothesisId?: string;
}

function getDebugIngestUrl(): string | null {
  const url = process.env.DEBUG_INGEST_URL ?? process.env.NEXT_PUBLIC_DEBUG_INGEST_URL;
  if (!url) return null;
  if (typeof url !== 'string') return null;
  if (url.length === 0) return null;
  return url;
}

function isDebugIngestEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_DEBUG_INGEST === '1') return true;
  return !!getDebugIngestUrl();
}

export function sendDebugIngestEvent(event: DebugIngestEvent): void {
  if (!isDebugIngestEnabled()) return;
  const ingestUrl = getDebugIngestUrl();
  if (!ingestUrl) return;

  const payload = {
    ...event,
    timestamp: event.timestamp ?? Date.now(),
    sessionId: event.sessionId ?? 'debug-session',
    runId:
      event.runId ?? ((globalThis as unknown as { __DBG_RUN_ID?: string }).__DBG_RUN_ID ?? 'dev'),
  };

  try {
    // Fire-and-forget: this is for optional local debugging only.
    void fetch(ingestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {
    // ignore
  }
}

