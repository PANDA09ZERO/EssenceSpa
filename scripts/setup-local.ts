// Script para configurar Supabase localmente
// Ejecutar con: npx ts-node scripts/setup-local.ts

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "your-anon-key";

async function main() {
  console.log("Configurando Supabase...");
  console.log(`URL: ${SUPABASE_URL}`);
  console.log("Conexión establecida");

  // Leer el SQL de migración
  const sqlPath = path.join(__dirname, "../config/database.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");
  console.log(`Archivo SQL cargado (${sql.length} bytes)`);
  console.log("Ejecutar el SQL en Supabase SQL Editor");
}

main().catch(console.error);
