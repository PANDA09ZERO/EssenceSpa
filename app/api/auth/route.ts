import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export { POST } from "./login/route";

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ error: "La sesión no es válida" }, { status: 401 });
  return NextResponse.json({ user: data.user }, { headers: { "Cache-Control": "no-store" } });
}
