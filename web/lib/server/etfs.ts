import { z } from "zod";
import rawDataset from "../../../data/etfs.json";
import { EtfDatasetSchema, type EtfDataset } from "./etf-schema";

let cached: EtfDataset | null = null;

export function getEtfDataset(): EtfDataset {
  if (cached) return cached;
  const result = EtfDatasetSchema.safeParse(rawDataset);
  if (!result.success) {
    throw new Error(`data/etfs.json failed validation: ${z.prettifyError(result.error)}`);
  }
  cached = result.data;
  return cached;
}
