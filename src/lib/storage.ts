/**
 * Klien Supabase Storage (server-side) untuk upload file biner seperti
 * dokumentasi IDP. Pakai service-role key — JANGAN diekspos ke client.
 * Kredensial di `.env.local`: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  // eslint-disable-next-line no-var
  var __agronowEssSupabase: SupabaseClient | undefined;
}

export function getStorage() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum di-set di .env.local");
  }
  if (!global.__agronowEssSupabase) {
    global.__agronowEssSupabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return global.__agronowEssSupabase.storage;
}
