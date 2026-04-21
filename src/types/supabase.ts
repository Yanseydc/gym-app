import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type TypedSupabaseClient = SupabaseClient<Database>;

export type AppSupabaseClient = {
  auth: Pick<TypedSupabaseClient["auth"], "getUser" | "signInWithPassword">;
  from: TypedSupabaseClient["from"];
  rpc: TypedSupabaseClient["rpc"];
  storage: TypedSupabaseClient["storage"];
};
