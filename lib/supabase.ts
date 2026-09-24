import { createClient } from "@supabase/supabase-js";

// Ces deux valeurs sont la configuration publique du projet Supabase du CRM.
// La clé publishable n'est pas une clé d'administration : les droits restent
// contrôlés par la session et les politiques RLS de Supabase.
const SUPABASE_URL = "https://vdmlixjrbudklieictfj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_5DSJ2xzo2pokkFbkB0FTRg_7T4DDwKg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "implicit",
    storageKey: "bosc-collaborateurs-auth",
  },
});

