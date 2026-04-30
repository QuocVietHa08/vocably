import { NextResponse } from "next/server";
import { ZodError } from "zod/v3";
import { ERROR_MESSAGES, LOG_EVENTS } from "./constants";

export class ValidationError extends Error {
  status = 400;
  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = "ValidationError";
  }
}

export class OpenAIError extends Error {
  status = 502;
  constructor(message: string, public upstreamStatus?: number) {
    super(message);
    this.name = "OpenAIError";
  }
}

export class OpenAITimeoutError extends OpenAIError {
  constructor() {
    super(ERROR_MESSAGES.openAITimeout, 504);
    this.name = "OpenAITimeoutError";
    this.status = 504;
  }
}

type ErrorBody = { error: string; details?: unknown };

export function handleError(err: unknown): NextResponse<ErrorBody> {
  if (err instanceof ValidationError) {
    log("warn", LOG_EVENTS.validationError, { message: err.message, details: err.details });
    return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
  }

  if (err instanceof ZodError) {
    log("warn", LOG_EVENTS.zodError, { issues: err.issues });
    return NextResponse.json(
      { error: ERROR_MESSAGES.invalidRequestBody, details: err.issues },
      { status: 400 },
    );
  }

  if (err instanceof OpenAIError) {
    log("error", LOG_EVENTS.openAIError, {
      message: err.message,
      upstreamStatus: err.upstreamStatus,
    });
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  log("error", LOG_EVENTS.unknownError, {
    message: err instanceof Error ? err.message : String(err),
  });
  return NextResponse.json({ error: ERROR_MESSAGES.internal }, { status: 500 });
}

export function log(
  level: "info" | "warn" | "error",
  event: string,
  data: Record<string, unknown> = {},
) {
  const line = JSON.stringify({ level, event, t: Date.now(), ...data });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
