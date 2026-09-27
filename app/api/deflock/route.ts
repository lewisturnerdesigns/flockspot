const DEFLOCK_DATASET_URL =
  "https://deflockdata.dontgetflocked.com/sharing-network-nodes.geojson";

export async function GET() {
  try {
    const response = await fetch(DEFLOCK_DATASET_URL, {
      headers: { Accept: "application/geo+json, application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return Response.json(
        { error: `DeFlock dataset returned HTTP ${response.status}.` },
        { status: response.status },
      );
    }

    return new Response(await response.text(), {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "Content-Type": "application/geo+json",
      },
    });
  } catch {
    return Response.json(
      { error: "Unable to reach the DeFlock dataset." },
      { status: 502 },
    );
  }
}
