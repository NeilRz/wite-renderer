/**
 * POST /api/generate
 *
 * Streams a heartbeat every 4s while the Gemini render is in flight so Vercel's
 * Hobby-tier 25s function ceiling doesn't kill the connection, then emits a
 * single JSON event with the base64 image (or an error).
 *
 * Wire format (newline-delimited JSON):
 *   {"event":"heartbeat","elapsed":4000}
 *   {"event":"heartbeat","elapsed":8000}
 *   {"event":"done","mimeType":"image/png","imageBase64":"..."}
 * or
 *   {"event":"error","message":"..."}
 */

import { NextRequest } from "next/server";
import { generateImage, type GenerateInputs } from "@/lib/gemini";

// Node runtime — sharp + the @google/genai SDK both work cleanly here.
export const runtime = "nodejs";
// Hobby tier max; on Pro this can go to 60+.
export const maxDuration = 60;

interface BodyShape extends Partial<GenerateInputs> {}

function bad(message: string, status = 400) {
  return new Response(JSON.stringify({ event: "error", message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  let body: BodyShape;
  try {
    body = (await req.json()) as BodyShape;
  } catch {
    return bad("Invalid JSON body");
  }

  const required: Array<keyof GenerateInputs> = [
    "modelId",
    "beltId",
    "buckleId",
    "setting",
    "pose",
  ];
  for (const k of required) {
    const v = body[k];
    if (typeof v !== "string" || v.trim() === "") {
      return bad(`Missing field: ${k}`);
    }
  }

  const inputs: GenerateInputs = {
    modelId: body.modelId!,
    beltId: body.beltId!,
    buckleId: body.buckleId!,
    setting: body.setting!.trim(),
    pose: body.pose!.trim(),
    beltDesc: body.beltDesc?.trim() || undefined,
    buckleDesc: body.buckleDesc?.trim() || undefined,
    shot: body.shot ?? "waist",
    sizeMult: typeof body.sizeMult === "number" ? body.sizeMult : 1.0,
    beltMult: typeof body.beltMult === "number" ? body.beltMult : 1.0,
  };

  const encoder = new TextEncoder();
  const startedAt = Date.now();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      const heartbeat = setInterval(() => {
        try {
          send({ event: "heartbeat", elapsed: Date.now() - startedAt });
        } catch {
          /* client gone */
        }
      }, 4000);

      try {
        const result = await generateImage(inputs);
        send({
          event: "done",
          mimeType: result.mimeType,
          imageBase64: result.imageBase64,
          elapsed: Date.now() - startedAt,
        });
      } catch (err) {
        send({
          event: "error",
          message: err instanceof Error ? err.message : String(err),
          elapsed: Date.now() - startedAt,
        });
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
