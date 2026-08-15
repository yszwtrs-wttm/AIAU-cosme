import { redirect } from "next/navigation";
import StoreMode from "@/components/StoreMode";
import { getMyUser, isRealAccount } from "@/lib/auth";

export const metadata = {
  title: "店頭モード — KAWANAI",
  description: "棚の前でバーコードをかざすと、持っているか・似ているかをその場で判定します。",
};

export default async function StorePage() {
  const user = await getMyUser();
  if (!isRealAccount(user)) redirect("/login");

  return <StoreMode />;
}
