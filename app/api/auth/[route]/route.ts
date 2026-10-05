import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function GET(request: NextRequest) {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) return NextResponse.json({ error: error.message }, { status: 401 });
  return NextResponse.json({ session });
}
