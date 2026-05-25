import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export async function findCategoryIdByAlias(
  supabase: SupabaseClient<Database>,
  alias: string
) {
  const aliasMap: Record<string, string[]> = {
    food: ["Food"],
    transport: ["Transport"],
    shopping: ["Shopping"],
    bills: ["Bills"],
    entertainment: ["Entertainment"],
    health: ["Health"],
    investment: ["Investment"],
    other: ["Other"]
  };

  const candidateNames = aliasMap[alias] ?? aliasMap.other;
  const { data, error } = await supabase.from("categories").select("id,name");
  if (error) throw error;

  const matched = data.find((category) => candidateNames.includes(category.name));
  return matched?.id ?? data[0]?.id ?? null;
}
