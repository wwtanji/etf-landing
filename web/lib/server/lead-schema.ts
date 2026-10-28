import { z } from "zod";
import { CONSENT_VERSION } from "./config";

const utmValue = z.string().trim().max(100).optional();

export const LeadRequestSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  consent: z.literal(true),
  consent_version: z.literal(CONSENT_VERSION),
  variant: z.enum(["a", "b"]),
  page_path: z.enum(["/", "/b"]),
  utm: z
    .object({
      source: utmValue,
      medium: utmValue,
      campaign: utmValue,
      content: utmValue,
      term: utmValue,
    })
    .optional()
    .default({}),
  // Honeypot: checked by the route before validation; never a validation error.
  website: z.string().optional().catch(undefined),
});

export type LeadRequest = z.infer<typeof LeadRequestSchema>;

/** Error code per top-level field, reported in the 422 `fields` object (plan §8.2). */
export const LEAD_FIELD_ERROR_CODES = {
  email: "invalid_email",
  consent: "consent_required",
  consent_version: "invalid_consent_version",
  variant: "invalid_variant",
  page_path: "invalid_page_path",
  utm: "invalid_utm",
} as const satisfies Record<string, string>;
