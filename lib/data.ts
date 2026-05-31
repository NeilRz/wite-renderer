/**
 * Server-side data loaders for models + product catalog.
 * Imports JSON via Next.js's built-in JSON module support.
 */

import modelsJson from "@/data/models.json";
import catalogJson from "@/data/catalog.json";

export interface Model {
  id: string;
  name: string;
  age: number;
  style_archetype: string;
  skin: string;
  hair_color: string;
  hair_type: string;
  hair_length: string;
  eyes: string;
  height_cm: number;
  waist_cm: number;
  default_hairstyle: string;
}

export interface Product {
  id: string;
  file: string;
  url: string;
}

const models = (modelsJson as { models: Model[] }).models;
const catalog = catalogJson as { belts: Product[]; buckles: Product[] };

export const MODELS: Model[] = models;
export const BELTS: Product[] = catalog.belts;
export const BUCKLES: Product[] = catalog.buckles;

export function findModel(id: string): Model | undefined {
  return models.find((m) => m.id === id);
}

export function findBelt(id: string): Product | undefined {
  return catalog.belts.find((b) => b.id === id);
}

export function findBuckle(id: string): Product | undefined {
  return catalog.buckles.find((b) => b.id === id);
}
