import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({
  code: z.string().trim().min(1).max(40),
  subtotal: z.number().min(0).max(10_000_000),
});

type Result = { code: string | null; discount: number; message: string };

async function run(fn: "check_coupon" | "redeem_coupon", data: z.infer<typeof input>): Promise<Result> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows, error } = await supabaseAdmin.rpc(fn, { _code: data.code, _subtotal: data.subtotal });
  if (error) throw new Error("Could not check this coupon right now.");
  const row = (rows as Result[] | null)?.[0];
  return { code: row?.code ?? null, discount: Number(row?.discount ?? 0), message: row?.message ?? "Invalid coupon code." };
}

/** Preview a coupon's discount without using it up. */
export const checkCoupon = createServerFn({ method: "POST" })
  .inputValidator((d) => input.parse(d))
  .handler(({ data }) => run("check_coupon", data));

/** Re-validate and count one use of a coupon at checkout. */
export const redeemCoupon = createServerFn({ method: "POST" })
  .inputValidator((d) => input.parse(d))
  .handler(({ data }) => run("redeem_coupon", data));
