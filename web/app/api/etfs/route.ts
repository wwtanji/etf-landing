import { getEtfDataset } from "@/lib/server/etfs";

export const runtime = "nodejs";
export const preferredRegion = "fra1";
export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  try {
    return Response.json(getEtfDataset(), {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (error: unknown) {
    console.error(
      JSON.stringify({
        event: "etf_data_invalid",
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    return Response.json({ ok: false, error: "data_invalid" }, { status: 500 });
  }
}
