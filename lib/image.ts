/**
 * Tight-crop helper. Strips a near-white background around a product
 * image so Gemini receives a tight, well-framed reference (the single
 * biggest fidelity win, validated against the Gradio version).
 *
 * Accepts EITHER a URL string OR a raw Buffer. URLs are fetched over
 * HTTP, which is how production reads from `public/catalog/` without
 * the catalog landing inside the serverless function bundle.
 */

import sharp from "sharp";

export async function tightCropToBuffer(
  source: string | Buffer,
  padding = 24,
  whiteThreshold = 240,
): Promise<Buffer> {
  let input: Buffer;
  if (typeof source === "string") {
    const res = await fetch(source);
    if (!res.ok) {
      throw new Error(`failed to fetch ${source}: ${res.status}`);
    }
    input = Buffer.from(await res.arrayBuffer());
  } else {
    input = source;
  }

  const img = sharp(input).rotate(); // honour EXIF
  const { width, height } = await img.metadata();
  if (!width || !height) {
    return await img.jpeg({ quality: 95 }).toBuffer();
  }

  // Build a grayscale mask. Foreground = anything darker than threshold.
  const gray = await img
    .clone()
    .ensureAlpha()
    .removeAlpha()
    .grayscale()
    .raw()
    .toBuffer();

  let minX = width, minY = height, maxX = 0, maxY = 0;
  let found = false;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = gray[y * width + x];
      if (v < whiteThreshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  if (!found) return await img.jpeg({ quality: 95 }).toBuffer();

  const left = Math.max(0, minX - padding);
  const top = Math.max(0, minY - padding);
  const right = Math.min(width, maxX + padding);
  const bottom = Math.min(height, maxY + padding);

  return await sharp(input)
    .rotate()
    .extract({
      left,
      top,
      width: right - left,
      height: bottom - top,
    })
    .jpeg({ quality: 95 })
    .toBuffer();
}
