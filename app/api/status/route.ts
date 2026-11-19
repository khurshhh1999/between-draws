import { hasCredentials, MODEL } from "@/lib/claude";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ live: hasCredentials(), model: MODEL });
}
