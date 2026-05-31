/**
 * Gemini Nano Banana Pro (gemini-3-pro-image) client.
 * Server-only — never bundle this into a Client Component.
 *
 * Reads product references over HTTP from the deployment's own public
 * URL rather than from disk. This keeps the 130 MB of catalog images
 * out of the serverless function bundle (otherwise we breach Vercel's
 * 250 MB function size limit).
 */

import { GoogleGenAI } from "@google/genai";
import { buildPrompt, type Shot } from "./prompt";
import { findModel, findBelt, findBuckle } from "./data";
import { tightCropToBuffer } from "./image";

const MODEL_NAME = "gemini-3-pro-image";

export interface GenerateInputs {
  modelId: string;
  beltId: string;
  buckleId: string;
  setting: string;
  pose: string;
  beltDesc?: string;
  buckleDesc?: string;
  shot?: Shot;
  sizeMult?: number;
  beltMult?: number;
  /** Absolute origin to resolve catalog asset URLs against (e.g. https://app.vercel.app). */
  origin: string;
}

export interface GenerateResult {
  imageBase64: string;
  mimeType: string;
}

function requireKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  return key;
}

export async function generateImage(input: GenerateInputs): Promise<GenerateResult> {
  const model = findModel(input.modelId);
  const belt = findBelt(input.beltId);
  const buckle = findBuckle(input.buckleId);
  if (!model) throw new Error(`unknown model: ${input.modelId}`);
  if (!belt) throw new Error(`unknown belt: ${input.beltId}`);
  if (!buckle) throw new Error(`unknown buckle: ${input.buckleId}`);

  const beltUrl = new URL(belt.url, input.origin).toString();
  const buckleUrl = new URL(buckle.url, input.origin).toString();

  const [beltBuf, buckleBuf] = await Promise.all([
    tightCropToBuffer(beltUrl),
    tightCropToBuffer(buckleUrl),
  ]);

  const prompt = buildPrompt({
    model,
    setting: input.setting,
    pose: input.pose,
    beltDesc: input.beltDesc,
    buckleDesc: input.buckleDesc,
    shot: input.shot,
    sizeMult: input.sizeMult,
    beltMult: input.beltMult,
  });

  const ai = new GoogleGenAI({ apiKey: requireKey() });
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [
      { text: prompt },
      { inlineData: { mimeType: "image/jpeg", data: beltBuf.toString("base64") } },
      { inlineData: { mimeType: "image/jpeg", data: buckleBuf.toString("base64") } },
    ],
    config: {
      responseModalities: ["IMAGE"],
      imageConfig: { aspectRatio: "3:4" },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const data = part.inlineData?.data;
    if (data) {
      return {
        imageBase64: data,
        mimeType: part.inlineData?.mimeType ?? "image/png",
      };
    }
  }
  throw new Error("No image returned from Gemini");
}
