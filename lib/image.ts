/**
 * Tight-crop helper. Strips a near-white background around a product
 * image so Gemini receives a tight, well-framed reference (which is
 * the single biggest fidelity win, validated against the Gradio version).
 */

import sharp from "sharp";

/**
 * Crop white/near-white background tight around the product, then
 * return the result as a JPEG buffer ready for Gemini.
 */
export async function tightCropToBuffer(
  inputPath: string,
  padding = 24,
  whiteThreshold = 240,
): Promise<Buffer> {
  const img = sharp(inputPath).rotate(); // honour EXIF
  const { width, height } = await img.metadata();
  if (!width || !height) return await img.jpeg({ quality: 95 }).toBuffer();

  // Convert to a grayscale mask: foreground = anything darker than threshold.
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

  return await sharp(inputPath)
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
