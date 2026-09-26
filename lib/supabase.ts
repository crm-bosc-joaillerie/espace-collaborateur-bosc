import { createClient } from "@supabase/supabase-js";

// Projet dédié au CRM collaborateurs. La clé publishable est publique ;
// les autorisations sont appliquées par les politiques RLS de cette base.
const SUPABASE_URL = "https://fqafgbboatbnljeoxtkq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_h0ARNvQAEySQmr5WzKVBcg_5mVVz7mR";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "implicit",
    storageKey: "bosc-collaborateurs-isolated-auth",
  },
});
