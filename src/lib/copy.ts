/**
 * 画面に出す呼び名の定義。
 *
 * 同じ対象が画面ごとに「Myポーチ」「手持ち」「ポーチ」と呼ばれると、
 * 同じ機能なのか分からなくなる。ユーザーに見せる呼び名はここだけで決める。
 *
 * - 登録済みの持ち物 = 「Myポーチ」（「手持ち」「ポーチ」とは書かない）
 * - 自分の情報のページ = 「マイページ」（「マイpage」とは書かない）
 */
export const TERMS = {
  /** ユーザーが登録した持ち物一式。DB / コード上は stash。 */
  pouch: "Myポーチ",
  /** 自分の情報・活動をまとめたページ（/me）。 */
  myPage: "マイページ",
} as const;

/** 複数の画面で出す定型文。言い回しもここで揃える。 */
export const COPY = {
  pouchWithCount: (count: number) => `${TERMS.pouch}（${count}点）`,
  publicPouchWithCount: (count: number) => `公開している${TERMS.pouch}（${count}点）`,
  viewPouch: `${TERMS.pouch}を見る`,
  addToPouch: `${TERMS.pouch}に追加`,
  inPouch: `${TERMS.pouch}に入っています`,
  loginToAddToPouch: `ログインして${TERMS.pouch}に追加`,
  pouchAddRequiresAccount: `${TERMS.pouch}への登録にはアカウント登録が必要です`,
  pouchRequiresAccount: `${TERMS.pouch}の利用にはアカウント登録が必要です`,
} as const;
