import { z } from "zod";

const coerceStr = (allowed, def) =>
  z.preprocess((v) => (v === undefined || v === "" ? def : String(v)), z.enum(allowed));

export const analyticsQuerySchema = z.object({
  range:    coerceStr(["7d", "30d", "6m", "1y"], "30d"),
  cropType: z.preprocess(
    (v) => (v === undefined || v === "" ? undefined : String(v)),
    z.string().max(80).optional()
  ),
});
