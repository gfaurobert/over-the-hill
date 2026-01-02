"use client";

import { useEffect } from "react";
import { sendDebugIngestEvent } from "../../lib/debug-ingest";

export function FetchPatch() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method ?? (input instanceof Request ? input.method : "GET");

      const shouldLog =
        typeof url === "string" &&
        (url.includes("/auth/v1/") || url.includes("/rest/v1/") || url.includes(":3001"));

      if (shouldLog) {
        sendDebugIngestEvent({
          location: "components/debug/FetchPatch.tsx:fetch",
          message: "window.fetch start",
          data: { method, url: url.slice(0, 200), pageOrigin: window.location.origin },
          hypothesisId: "B",
        });
      }

      try {
        const response = await originalFetch(input as any, init);
        if (shouldLog) {
          sendDebugIngestEvent({
            location: "components/debug/FetchPatch.tsx:fetch",
            message: "window.fetch end",
            data: { method, url: url.slice(0, 200), status: response.status, ok: response.ok },
            hypothesisId: "C",
          });
        }
        return response;
      } catch (error) {
        if (shouldLog) {
          sendDebugIngestEvent({
            location: "components/debug/FetchPatch.tsx:fetch",
            message: "window.fetch threw",
            data: {
              method,
              url: url.slice(0, 200),
              errorName: error instanceof Error ? error.name : typeof error,
              errorMessage: error instanceof Error ? error.message : String(error),
            },
            hypothesisId: "B",
          });
        }
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}

