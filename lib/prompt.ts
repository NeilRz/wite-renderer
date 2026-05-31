/**
 * Prompt assembly for Gemini 3 Pro Image (Nano Banana Pro).
 * Mirror of scripts/generate.py — kept as a pure function for easy testing.
 */

import type { Model } from "./data";

export type Shot = "waist" | "half" | "full";

export const FRAMING: Record<Shot, string> = {
  waist:
    "== FRAMING (critical) ==\n" +
    "- WAIST-HERO CROP: tightly composed around the waist.\n" +
    "- Visible body range: upper thigh (bottom of frame) to upper chest (top). " +
    "Face partially cropped at the top of the frame or softly out of focus — the " +
    "viewer's eye must go straight to the belt.\n" +
    "- Belt sits in the MIDDLE THIRD of the frame, horizontally centered. " +
    "The buckle alone should fill ~10–15% of frame area.\n" +
    "- Camera at belt height, very slight low angle.\n" +
    "- Aspect ratio: 3:4 vertical.",
  half:
    "== FRAMING (critical) ==\n" +
    "- HALF-BODY CROP: framed from upper thigh at the bottom to just above the head at the top.\n" +
    "- Face fully visible and in sharp focus, natural editorial expression.\n" +
    "- Belt sits in the LOWER THIRD of the frame, fully visible and in sharp focus; " +
    "buckle clearly readable.\n" +
    "- Camera at upper-chest height, very slight low angle.\n" +
    "- Aspect ratio: 3:4 vertical.",
  full:
    "== FRAMING (critical) ==\n" +
    "- FULL-BODY CROP: full head-to-feet, classic editorial fashion proportions, " +
    "with breathing room above the head and below the feet.\n" +
    "- Belt sits in the MIDDLE of the frame, clearly visible and in sharp focus; " +
    "buckle readable at this distance.\n" +
    "- Camera at chest height, very slight low angle.\n" +
    "- Aspect ratio: 3:4 vertical.",
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function beltWidthBlock(mult: number): string {
  const m = clamp(mult, 0.5, 2.0);
  const fingerWidths = (2.0 * m).toFixed(1);
  const tone =
    m < 0.85
      ? "NARROW — closer to a watch-strap proportion than a classic belt"
      : m < 1.2
        ? "STANDARD — a classic narrow ready-to-wear belt proportion"
        : m < 1.6
          ? "MEDIUM — a slightly wider belt, still feminine and refined"
          : "WIDE — a bold structured belt";
  return (
    "== BELT STRAP WIDTH (strict) ==\n" +
    `The belt strap on the body has a visible height (width) of APPROXIMATELY ` +
    `${fingerWidths} of the model's finger-widths stacked — that is ${tone}.\n` +
    "- Use the model's hand and finger thickness in the image as your size anchor.\n" +
    "- Do NOT make the strap wider than this. Image models reliably over-scale belt " +
    "straps for editorial flair — RESIST that tendency.\n" +
    "- A slightly undersized strap is preferable to oversized."
  );
}

export function buckleSizeBlock(mult: number): string {
  const m = clamp(mult, 0.5, 2.0);
  const tone =
    m < 0.95
      ? "noticeably SMALLER than the belt strap — a subtle, understated buckle"
      : m < 1.15
        ? "approximately EQUAL to the belt strap width — a classic, restrained proportion"
        : m < 1.6
          ? "moderately LARGER than the belt strap — a natural, ready-to-wear proportion"
          : "clearly LARGER than the belt strap — a confident statement proportion";
  return (
    "== BUCKLE SIZE (strict) ==\n" +
    `The buckle's visible width on the worn belt is APPROXIMATELY ${m.toFixed(2)}× ` +
    `the belt strap width. That is ${tone}.\n` +
    "- Use the belt strap (visible in the reference image) as your size anchor — measure the buckle relative to it.\n" +
    "- Do NOT exceed this ratio. Do NOT inflate the buckle for editorial flair.\n" +
    "- A slightly undersized rendering is preferable to oversized."
  );
}

export interface PromptInputs {
  model: Model;
  setting: string;
  pose: string;
  beltDesc?: string;
  buckleDesc?: string;
  shot?: Shot;
  sizeMult?: number;
  beltMult?: number;
}

export function buildPrompt({
  model,
  setting,
  pose,
  beltDesc,
  buckleDesc,
  shot = "waist",
  sizeMult = 1.0,
  beltMult = 1.0,
}: PromptInputs): string {
  const framing = FRAMING[shot] ?? FRAMING.waist;
  const beltBlock = beltDesc
    ? `BELT — the FIRST reference image.\nDescription: ${beltDesc}\n`
    : "BELT — the FIRST reference image.\n";
  const buckleBlock = buckleDesc
    ? `BUCKLE — the SECOND reference image.\nDescription: ${buckleDesc}\n`
    : "BUCKLE — the SECOND reference image.\n";

  return `Create a single photorealistic editorial fashion photograph in the visual language of a top-tier luxury belt brand (Hermès / Saint Laurent / Khaite). The BELT and BUCKLE are the HERO of the image, not the model.

${framing}

== BELT & BUCKLE FIDELITY (non-negotiable) ==
You MUST reproduce the belt and buckle EXACTLY as they appear in the reference images. This is a product catalog render — the customer must recognize their exact product.
- Do NOT stylize, simplify, redesign, or reinterpret the buckle's shape, finish, or proportions.
- Match the buckle's EXACT silhouette, aspect ratio, finish (metal type, patina, polish), surface detail, and prong geometry.
- Match the belt's EXACT color, leather/suede grain, width, and edge finish.
- If a detail in the reference is ambiguous, err on the side of copying it literally.
- BUCKLE SCALE WARNING: do NOT inflate the buckle's worn size for editorial flair. Image models reliably over-scale accessories — RESIST that tendency. The visible size of the buckle on the belt MUST follow the BUCKLE SIZE block below. A slightly undersized rendering is preferable to oversized.

${beltWidthBlock(beltMult)}

${buckleSizeBlock(sizeMult)}

${beltBlock}
The belt is worn around the waist of the model, cinched naturally, with the buckle attached at the FRONT CENTER, perfectly centered horizontally in the frame.

${buckleBlock}

== MODEL ==
- ${model.age}-year-old woman, archetype: ${model.style_archetype}
- Skin: ${model.skin}; Hair: ${model.hair_color}, ${model.hair_type}, ${model.hair_length}, styled as ${model.default_hairstyle}
- Eyes: ${model.eyes}; Build: ${model.height_cm}cm tall, waist ${model.waist_cm}cm, slim editorial proportions.

== OUTFIT ==
- A simple, modern outfit that does NOT cover or obscure the belt or buckle (tucked silk blouse, fine knit tucked in, fitted top + high-waist trouser or skirt).
- Outfit colors complement the belt without competing with it. Neutral, editorial palette.

== SETTING ==
${setting}

== POSE ==
${pose}

== TECHNICAL ==
- Photorealistic, shot on a medium-format camera with an 80mm lens equivalent, f/2.8, shallow depth of field.
- Soft natural light. True-to-life color. Belt and buckle in tack-sharp focus.
- No text, no watermark, no logo. Single subject, single frame.
`;
}
