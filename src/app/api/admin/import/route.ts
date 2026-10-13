import { requireAdminApi } from "@/lib/auth";
import { extractProduct } from "@/lib/import/extract";
import { importRequestSchema } from "@/lib/validation";
import type { Category } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = importRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { data: categories } = await auth.supabase
    .from("categories")
    .select("id, name, slug, gender, sort_order")
    .order("sort_order");

  // extractProduct never throws: on failure it returns an empty, editable result with a message.
  const result = await extractProduct(parsed.data, (categories ?? []) as Category[]);
  return Response.json(result, { status: 200 });
}
