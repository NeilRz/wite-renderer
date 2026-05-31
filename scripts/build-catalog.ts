/**
 * Walks public/catalog/{belts,buckles}/ and writes data/catalog.json
 * with the full list of products. Run with: `npm run build-catalog`.
 */
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const PUBLIC_CATALOG = join(ROOT, "public", "catalog");
const OUTPUT = join(ROOT, "data", "catalog.json");

const VALID = /\.(jpe?g|png|webp)$/i;

function listProducts(folder: string) {
  const dir = join(PUBLIC_CATALOG, folder);
  return readdirSync(dir)
    .filter((f) => VALID.test(f))
    .sort()
    .map((file) => ({
      id: file.replace(/\.[^.]+$/, ""),
      file,
      url: `/catalog/${folder}/${file}`,
    }));
}

const catalog = {
  belts: listProducts("belts"),
  buckles: listProducts("buckles"),
};

writeFileSync(OUTPUT, JSON.stringify(catalog, null, 2));
console.log(
  `wrote ${OUTPUT}: ${catalog.belts.length} belts, ${catalog.buckles.length} buckles`,
);
