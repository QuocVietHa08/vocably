import { NextResponse } from "next/server";
import { checkAnswer } from "./_lib/check-answer";
import { generateTask } from "./_lib/generate-task";
import { handleError, ValidationError } from "./_lib/errors";
import { RequestSchema } from "./_lib/schemas";
import { ERROR_MESSAGES } from "./_lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const raw = await request.json().catch(() => {
      throw new ValidationError(ERROR_MESSAGES.invalidJson);
    });

    const parsed = RequestSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError(ERROR_MESSAGES.invalidPayload, parsed.error.issues);
    }

    switch (parsed.data.action) {
      case "generate":
        return NextResponse.json(await generateTask(parsed.data));
      case "check":
        return NextResponse.json(await checkAnswer(parsed.data));
    }
  } catch (err) {
    return handleError(err);
  }
}
