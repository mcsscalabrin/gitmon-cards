import { searchUsers } from "@/lib/github/search";

// User-search suggestions for the home form (as-you-type by name). Never
// blocks the scout path: failures resolve to an empty list so the client just
// hides the dropdown.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (!q) return Response.json({ hits: [] });
  try {
    const hits = await searchUsers(q);
    return Response.json({ hits }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ hits: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}
