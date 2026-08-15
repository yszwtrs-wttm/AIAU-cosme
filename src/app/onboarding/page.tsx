import { redirect } from "next/navigation";
import OnboardingWizard from "@/components/OnboardingWizard";
import { getMyProfile, getMyUser, isRealAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";

export default async function OnboardingPage() {
  const user = await getMyUser();
  if (!isRealAccount(user)) redirect("/login");

  const profile = await getMyProfile();
  if (!profile) redirect("/settings");

  const supabase = await createClient();
  const { data: popular } = await supabase
    .from("products")
    .select(
      "id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex)",
    )
    .order("price_yen", { ascending: true })
    .limit(18)
    .returns<Product[]>();

  return <OnboardingWizard profile={profile} products={popular ?? []} />;
}
