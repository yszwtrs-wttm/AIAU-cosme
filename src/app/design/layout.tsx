import type { Metadata } from "next";
import { Switcher } from "./switcher";

export const metadata: Metadata = {
  title: "KAWANAI — デザインSkill比較プレビュー",
};

/**
 * プレビュー用の枠。各バリアントの見た目に干渉しないよう、切り替えバー以外は何も足さない。
 */
export default function DesignLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Switcher />
      {children}
    </>
  );
}
