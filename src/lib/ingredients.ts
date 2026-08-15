/**
 * 成分の日本語名と「何のために入っているのか」の辞書。
 *
 * 全成分表示は INCI（英語）でしか手に入らないので、画面に出すときは必ずここを通して
 * 日本語名・役割・一言効果に変換する。役割でグルーピングすると「この商品は何でできているか」が
 * 一覧で読めるようになる。
 */

export type Role =
  | "base"
  | "moisture"
  | "active"
  | "color"
  | "texture"
  | "cleanse"
  | "uv"
  | "preserve"
  | "fragrance";

export const ROLE_LABEL: Record<Role, string> = {
  base: "ベース（土台になる成分）",
  moisture: "うるおい",
  active: "効果が期待できる成分",
  color: "色のもと",
  texture: "質感・仕上がりを作る成分",
  cleanse: "汚れを落とす・髪をなめらかにする",
  uv: "紫外線カット",
  preserve: "品質を保つ成分",
  fragrance: "香り",
};

/** タブなど幅の狭い場所で使う短い名前。 */
export const ROLE_SHORT_LABEL: Record<Role, string> = {
  base: "ベース",
  moisture: "うるおい",
  active: "効果",
  color: "色のもと",
  texture: "質感",
  cleanse: "洗浄・補修",
  uv: "紫外線カット",
  preserve: "品質保持",
  fragrance: "香り",
};

/** 表示順。上に来るものほどユーザーの関心が高い。 */
export const ROLE_ORDER: Role[] = [
  "active",
  "moisture",
  "color",
  "texture",
  "uv",
  "cleanse",
  "base",
  "preserve",
  "fragrance",
];

export type IngredientInfo = {
  ja: string;
  role: Role;
  /** 一言でどう役に立つのか。専門用語は使わない。 */
  effect: string;
  /** 気にする人向けのひとこと。無い場合は付けない。 */
  caution?: string;
};

export const INGREDIENTS: Record<string, IngredientInfo> = {
  // ---- ベース・油分
  WATER: { ja: "水", role: "base", effect: "他の成分を溶かして全体をなじませる土台" },
  GLYCERIN: { ja: "グリセリン", role: "moisture", effect: "水分を抱えこんで乾燥を防ぐ、定番の保湿成分" },
  "BUTYLENE GLYCOL": { ja: "BG（ブチレングリコール）", role: "moisture", effect: "しっとりさせつつ、感触を軽く整える保湿成分" },
  SQUALANE: { ja: "スクワラン", role: "moisture", effect: "肌なじみがよく、乾燥を防ぐ油分" },
  "CAPRYLIC/CAPRIC TRIGLYCERIDE": { ja: "中鎖脂肪酸トリグリセリド", role: "texture", effect: "さらっと伸びる軽い油分。ベタつきを抑える" },
  "HYDROGENATED POLYISOBUTENE": { ja: "水添ポリイソブテン", role: "texture", effect: "つるんとしたツヤと密着感を出す油分" },
  "DIISOSTEARYL MALATE": { ja: "リンゴ酸ジイソステアリル", role: "texture", effect: "とろっとしたツヤと、色の伸びのよさを作る油分" },
  OCTYLDODECANOL: { ja: "オクチルドデカノール", role: "texture", effect: "色材をなめらかに分散させ、伸びを軽くする油分" },
  "ISOPROPYL MYRISTATE": { ja: "ミリスチン酸イソプロピル", role: "texture", effect: "さらっと伸びて浸透感を出す油分" },
  "RICINUS COMMUNIS SEED OIL": { ja: "ヒマシ油", role: "texture", effect: "色つきとツヤを長持ちさせる、粘りのある植物油" },
  "SIMMONDSIA CHINENSIS SEED OIL": { ja: "ホホバ種子油", role: "moisture", effect: "肌にも髪にもなじみやすい保湿オイル" },
  "ARGANIA SPINOSA KERNEL OIL": { ja: "アルガンオイル", role: "moisture", effect: "パサつきを抑えてしっとりまとめる植物油" },
  "JOJOBA ESTERS": { ja: "ホホバエステル", role: "texture", effect: "ワックスのような感触で、なめらかさを保つ" },
  "SHEA BUTTER ETHYL ESTERS": { ja: "シアバターエチルエステル", role: "moisture", effect: "シアバター由来のこくのある保湿成分" },
  "POLYGLYCERYL-2 TRIISOSTEARATE": { ja: "トリイソステアリン酸ポリグリセリル-2", role: "texture", effect: "色材と油分を混ぜて、均一な発色にする" },
  "PHYTOSTERYL/OCTYLDODECYL LAUROYL GLUTAMATE": { ja: "ラウロイルグルタミン酸ジ（フィトステリル/オクチルドデシル）", role: "moisture", effect: "唇の水分を逃がさず、ぷるんとした感触にする" },
  "CERA ALBA": { ja: "ミツロウ", role: "texture", effect: "形をキープして落ちにくくする天然ワックス" },
  "CANDELILLA WAX": { ja: "キャンデリラロウ", role: "texture", effect: "固さを出して溶けにくくする植物ワックス" },
  "MICROCRYSTALLINE WAX": { ja: "マイクロクリスタリンワックス", role: "texture", effect: "スティックの形を保ち、密着させるワックス" },
  POLYETHYLENE: { ja: "ポリエチレン", role: "texture", effect: "硬さと厚みを出して、こすれても落ちにくくする" },
  "CETEARYL ALCOHOL": { ja: "セテアリルアルコール", role: "texture", effect: "とろみを付けて、しっとりした感触にする（お酒のアルコールではない）" },
  "STEARYL ALCOHOL": { ja: "ステアリルアルコール", role: "texture", effect: "こくのあるクリーム状の感触を作る" },
  "GLYCOL DISTEARATE": { ja: "ジステアリン酸グリコール", role: "texture", effect: "とろみとパール感のある見た目にする" },

  // ---- シリコーン・伸び
  DIMETHICONE: { ja: "ジメチコン", role: "texture", effect: "つるんと軽く伸ばせて、表面をなめらかに整える" },
  METHICONE: { ja: "メチコン", role: "texture", effect: "粉をコーティングして、きしみのない伸びにする" },
  CYCLOPENTASILOXANE: { ja: "シクロペンタシロキサン", role: "texture", effect: "水のように軽く伸びて、塗った後はさらっと乾く" },
  ISODODECANE: { ja: "イソドデカン", role: "texture", effect: "さっと乾いて、色を密着させる（落ちにくさの決め手）" },
  TRIMETHYLSILOXYSILICATE: { ja: "トリメチルシロキシケイ酸", role: "texture", effect: "膜を作って色移りを防ぐ、マット系の落ちにくさを作る成分" },
  "PEG-10 DIMETHICONE": { ja: "PEG-10ジメチコン", role: "texture", effect: "水と油をなじませて、なめらかな液状にする" },
  "LAURYL PEG-9 POLYDIMETHYLSILOXYETHYL DIMETHICONE": { ja: "ラウリルPEG-9ポリジメチルシロキシエチルジメチコン", role: "texture", effect: "崩れにくい油性のベースを作る" },
  AMODIMETHICONE: { ja: "アモジメチコン", role: "cleanse", effect: "傷んだ部分に吸着して、指通りをなめらかにする" },
  TRIETHOXYCAPRYLYLSILANE: { ja: "トリエトキシカプリリルシラン", role: "texture", effect: "粉の表面を撥水加工して、汗でも崩れにくくする" },
  "DISTEARDIMONIUM HECTORITE": { ja: "ジステアルジモニウムヘクトライト", role: "texture", effect: "分離を防いで、粉と油を均一に保つ" },

  // ---- 粉・質感
  TALC: { ja: "タルク", role: "texture", effect: "さらさらした肌触りと、なめらかな伸びを作る粉" },
  MICA: { ja: "マイカ（雲母）", role: "color", effect: "自然な光沢を出して、肌の凹凸をぼかす" },
  "SYNTHETIC FLUORPHLOGOPITE": { ja: "合成フルオロフロゴパイト", role: "color", effect: "透明感のあるきれいなツヤ・きらめきを出す" },
  SILICA: { ja: "シリカ", role: "texture", effect: "皮脂を吸ってサラサラに保ち、テカリを抑える" },
  "BORON NITRIDE": { ja: "窒化ホウ素", role: "texture", effect: "しっとり密着して、粉っぽさのない仕上がりにする" },
  "ZINC STEARATE": { ja: "ステアリン酸亜鉛", role: "texture", effect: "粉を固めて、肌への密着をよくする" },
  "MAGNESIUM MYRISTATE": { ja: "ミリスチン酸マグネシウム", role: "texture", effect: "しっとりした粉の感触にする" },
  "ALUMINUM HYDROXIDE": { ja: "水酸化アルミニウム", role: "texture", effect: "顔料の表面を整えて、色ムラを防ぐ" },
  "CALCIUM ALUMINUM BOROSILICATE": { ja: "ホウケイ酸（Ca/Al）", role: "color", effect: "ガラスのようなきらめきを出すラメの土台" },
  "TIN OXIDE": { ja: "酸化スズ", role: "color", effect: "パール剤の輝きを強める" },

  // ---- 色材
  "TITANIUM DIOXIDE": { ja: "酸化チタン", role: "color", effect: "白の色材。カバー力と紫外線カットの両方を担う" },
  "ZINC OXIDE": { ja: "酸化亜鉛", role: "uv", effect: "紫外線をはね返しつつ、皮脂をおさえる白い粉" },
  "IRON OXIDES": { ja: "酸化鉄", role: "color", effect: "肌色を作る基本の色材（黄・赤・黒の組み合わせ）" },
  "CI 77491": { ja: "赤色酸化鉄", role: "color", effect: "赤みを作る色材" },
  "CI 77492": { ja: "黄色酸化鉄", role: "color", effect: "黄みを作る色材" },
  "CI 77499": { ja: "黒色酸化鉄", role: "color", effect: "暗さ・深みを作る色材" },
  "CI 77891": { ja: "酸化チタン（色材）", role: "color", effect: "明るさを足す白の色材" },
  "CI 15850": { ja: "赤色202号", role: "color", effect: "青みのある赤を出す色材" },
  "CI 45410": { ja: "赤色223号", role: "color", effect: "透け感のあるピンクレッドを出す色材" },
  "CI 19140": { ja: "黄色4号", role: "color", effect: "黄みを足して明るく見せる色材" },
  "CI 42090": { ja: "青色1号", role: "color", effect: "青みを足して、くすみのない発色にする色材" },

  // ---- 効果のある成分
  NIACINAMIDE: { ja: "ナイアシンアミド", role: "active", effect: "美白とシワ改善の両方で効果が認められている成分" },
  "ASCORBYL GLUCOSIDE": { ja: "アスコルビルグルコシド", role: "active", effect: "ビタミンCの仲間。透明感のケアに使われる" },
  PANTHENOL: { ja: "パンテノール", role: "active", effect: "荒れをしずめ、うるおいを保つ（髪のハリにも使われる）" },
  "SALICYLIC ACID": { ja: "サリチル酸", role: "active", effect: "余分な角質や皮脂を落として、ざらつきを整える", caution: "敏感な状態では刺激を感じることがある" },
  "PIROCTONE OLAMINE": { ja: "ピロクトンオラミン", role: "active", effect: "フケ・かゆみの原因菌をおさえる" },
  "ZINC PYRITHIONE": { ja: "ジンクピリチオン", role: "active", effect: "頭皮のフケ・かゆみをおさえる", caution: "国によって配合が制限されている成分" },
  "ISOPROPYL METHYLPHENOL": { ja: "イソプロピルメチルフェノール", role: "active", effect: "菌の増殖をおさえて、においやニキビを防ぐ" },
  BIOTIN: { ja: "ビオチン", role: "active", effect: "髪や地肌のコンディションを整える" },
  "HYDROLYZED KERATIN": { ja: "加水分解ケラチン", role: "active", effect: "髪の欠けた部分を補って、ハリとまとまりを出す" },
  "CAMELLIA SINENSIS LEAF EXTRACT": { ja: "チャ葉エキス", role: "active", effect: "におい・皮脂のケアに使われる植物エキス" },

  // ---- うるおい
  "HYALURONIC ACID": { ja: "ヒアルロン酸", role: "moisture", effect: "水をたっぷり抱えて、もっちりしたうるおいを出す" },
  "SODIUM HYALURONATE": { ja: "ヒアルロン酸Na", role: "moisture", effect: "肌なじみのよいヒアルロン酸。表面のうるおいを保つ" },
  "TOCOPHERYL ACETATE": { ja: "酢酸トコフェロール（ビタミンE）", role: "moisture", effect: "血行を助けて、荒れやかさつきをケアする" },

  // ---- 洗浄
  "SODIUM LAURETH SULFATE": { ja: "ラウレス硫酸Na", role: "cleanse", effect: "泡立ちがよく、皮脂をしっかり落とす洗浄成分", caution: "洗浄力が強め。乾燥しやすい人は要注意" },
  "COCAMIDOPROPYL BETAINE": { ja: "コカミドプロピルベタイン", role: "cleanse", effect: "泡をきめ細かくして、洗い上がりのきしみを減らすやさしい洗浄成分" },
  "LAURAMIDOPROPYL BETAINE": { ja: "ラウラミドプロピルベタイン", role: "cleanse", effect: "低刺激な洗浄成分。泡の持ちをよくする" },
  "SODIUM COCOYL GLUTAMATE": { ja: "ココイルグルタミン酸Na", role: "cleanse", effect: "アミノ酸系のやさしい洗浄成分。しっとり洗える" },
  "COCAMIDE MEA": { ja: "コカミドMEA", role: "cleanse", effect: "泡をもっちりさせて、洗いやすくする" },
  "BEHENTRIMONIUM CHLORIDE": { ja: "ベヘントリモニウムクロリド", role: "cleanse", effect: "髪の表面を整えて、指通りをなめらかにする" },
  "POLYQUATERNIUM-10": { ja: "ポリクオタニウム-10", role: "cleanse", effect: "洗っている間の絡まりを防ぐ" },

  // ---- 紫外線
  "ETHYLHEXYL METHOXYCINNAMATE": { ja: "メトキシケイヒ酸エチルヘキシル", role: "uv", effect: "紫外線を吸収して日焼けを防ぐ", caution: "敏感な人はまれに刺激を感じることがある" },

  // ---- 品質保持・その他
  PHENOXYETHANOL: { ja: "フェノキシエタノール", role: "preserve", effect: "細菌の繁殖を防いで、品質を保つ" },
  "SODIUM BENZOATE": { ja: "安息香酸Na", role: "preserve", effect: "品質を保つための防腐成分" },
  "GLYCERYL CAPRYLATE": { ja: "カプリル酸グリセリル", role: "preserve", effect: "うるおいを与えながら、品質保持も助ける" },
  TOCOPHEROL: { ja: "トコフェロール（ビタミンE）", role: "preserve", effect: "油分の酸化を防いで、劣化しにくくする" },
  "CITRIC ACID": { ja: "クエン酸", role: "preserve", effect: "pH を整えて、きしみや変質を防ぐ" },
  "SODIUM CHLORIDE": { ja: "塩化Na（塩）", role: "preserve", effect: "とろみや使用感を調整する" },
  "DISODIUM EDTA": { ja: "EDTA-2Na", role: "preserve", effect: "水道水の金属イオンの影響を抑えて、品質を安定させる" },

  // ---- 香り・清涼感
  FRAGRANCE: { ja: "香料", role: "fragrance", effect: "香りを付ける", caution: "香りが苦手な人・敏感な人は注意" },
  MENTHOL: { ja: "メントール", role: "fragrance", effect: "ひんやりした清涼感を出す", caution: "刺激を感じることがある" },
  "MENTHYL LACTATE": { ja: "乳酸メンチル", role: "fragrance", effect: "おだやかで長続きする清涼感を出す" },
};

/** 辞書に無い INCI は、名前のパターンから役割だけでも当てる。 */
function guessRole(inci: string): Role {
  if (/^CI \d+/.test(inci)) return "color";
  if (/(WAX|CERA|POLYETHYLENE)/.test(inci)) return "texture";
  if (/(SILOXANE|DIMETHICONE|SILICONE|METHICONE)/.test(inci)) return "texture";
  if (/(GLYCOL|GLYCERIN|HYALURON|OIL|BUTTER)/.test(inci)) return "moisture";
  if (/(SULFATE|BETAINE|GLUTAMATE|SOAP)/.test(inci)) return "cleanse";
  if (/(PARABEN|BENZOATE|PHENOXYETHANOL|EDTA)/.test(inci)) return "preserve";
  if (/(FRAGRANCE|PARFUM|MENTHOL)/.test(inci)) return "fragrance";
  return "base";
}

export type ResolvedIngredient = {
  inci: string;
  ja: string;
  role: Role;
  effect: string;
  caution?: string;
  /** 全成分表示での順番（1 が最も多く入っている） */
  pos: number;
  known: boolean;
};

export function resolveIngredient(inci: string, pos: number): ResolvedIngredient {
  const hit = INGREDIENTS[inci];
  if (hit) return { inci, pos, known: true, ...hit };
  return {
    inci,
    pos,
    known: false,
    ja: inci,
    role: guessRole(inci),
    effect: "配合目的の情報がまだありません",
  };
}

export function resolveIngredients(list: string[]): ResolvedIngredient[] {
  return list.map((inci, i) => resolveIngredient(inci, i + 1));
}

export function groupByRole(list: ResolvedIngredient[]): { role: Role; items: ResolvedIngredient[] }[] {
  return ROLE_ORDER.map((role) => ({ role, items: list.filter((x) => x.role === role) })).filter(
    (g) => g.items.length > 0,
  );
}

/**
 * 成分構成を短い箇条書きにまとめる。「何でできているか」を先に読ませたいので、
 * 全成分リストの上に出す。集計だけで作れるのでルールベース。
 */
export function summarizeIngredientPoints(list: ResolvedIngredient[]): string[] {
  const top = list.slice(0, 6);
  const has = (role: Role) => top.some((x) => x.role === role);
  const actives = list.filter((x) => x.role === "active");
  const parts: string[] = [];

  if (has("cleanse")) {
    const gentle = top.some((x) => /BETAINE|GLUTAMATE/.test(x.inci));
    parts.push(gentle ? "やさしい洗浄成分が中心の処方" : "泡立ちのよい洗浄成分が中心の処方");
  } else if (has("moisture") && !has("texture")) {
    parts.push("うるおい成分が中心の処方");
  } else if (top.some((x) => /WAX|CERA|POLYETHYLENE/.test(x.inci))) {
    parts.push("ワックスと油分で固めた、落ちにくいタイプ");
  } else if (top.some((x) => /SILOXANE|ISODODECANE|DIMETHICONE/.test(x.inci))) {
    parts.push("軽く伸びるシリコーン系のベース");
  } else if (top[0]?.inci === "WATER") {
    parts.push("水ベースの軽い処方");
  } else {
    parts.push("油分ベースの処方");
  }

  if (actives.length > 0) {
    parts.push(`効果が期待できる成分が${actives.length}種（${actives.slice(0, 3).map((a) => a.ja).join("・")}）`);
  }

  const noFragrance = !list.some((x) => x.role === "fragrance");
  if (noFragrance) parts.push("香料は入っていません");

  const cautions = list.filter((x) => x.caution).slice(0, 2);
  if (cautions.length > 0) {
    parts.push(`気にする人向け：${cautions.map((c) => c.ja).join("・")}が入っています`);
  }

  return parts;
}
