import { NextResponse } from "next/server";

export async function POST() {
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "AI_API_KEY is not set in .env.local" },
      { status: 500 }
    );
  }

  // Exchange real API key for a short-lived ephemeral token.
  // The ephemeral token is only valid for 60 seconds and is safe to send to the browser.
  const res = await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-realtime-preview-2024-12-17",
      voice: "alloy",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
