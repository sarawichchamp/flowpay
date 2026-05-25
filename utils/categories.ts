import type { Category, Locale } from "@/types/domain";
import { t, type DictionaryKey } from "@/i18n/dictionary";

const categoryLabelKeys: Record<string, DictionaryKey> = {
  food: "categoryFood",
  transport: "categoryTransport",
  shopping: "categoryShopping",
  bills: "categoryBills",
  entertainment: "categoryEntertainment",
  health: "categoryHealth",
  investment: "categoryInvestment",
  other: "categoryOther"
} satisfies Record<string, DictionaryKey>;

export function getCategoryLabel(locale: Locale, categoryId: string) {
  const key = categoryLabelKeys[categoryId] ?? "categoryOther";
  return t(locale, key);
}

export function resolveCategoryId(categories: Category[], requestedCategoryId: string) {
  if (categories.some((category) => category.id === requestedCategoryId)) return requestedCategoryId;

  const categoryAliasMap: Record<string, string[]> = {
    food: ["food"],
    transport: ["transport"],
    shopping: ["shopping"],
    bills: ["bills"],
    entertainment: ["entertainment"],
    health: ["health"],
    investment: ["investment"],
    other: ["other"]
  };

  const aliases = categoryAliasMap[requestedCategoryId] ?? categoryAliasMap.other;
  const matchedCategory = categories.find((category) => aliases.includes(category.id) || aliases.includes(category.name.toLowerCase()));
  return matchedCategory?.id ?? categories[0]?.id ?? requestedCategoryId;
}
