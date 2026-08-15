#!/usr/bin/env python3
"""デモ用シードデータ生成。

実在ブランドの成分表を無断転載しないため、ブランド名・商品名は架空。
成分リストは各カテゴリで実際に使われる INCI 名から構成し、
「配合順が近い＝処方が近い」という関係が数値に出るように組んである。

    python3 scripts/generate_seed.py > supabase/seed.sql          # デモ用の小規模セット
    python3 scripts/generate_seed.py --scale large > supabase/seed.sql  # 性能検証用

--scale / --products で規模を切り替える。デモ用のセット（手で組んだ被り・代替・
サクラのシナリオ）は規模に関係なく必ず入り、増分は同じ性質を持つ商品群を
手続き的に足す形で作る。
"""

import argparse
import random

SCALE_PRESETS = {
    # scale: (商品数の目標, 追加商品1件あたりの平均口コミ数)
    "demo": (0, 0),
    "medium": (300, 4),
    "large": (2000, 6),
}


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--scale", choices=sorted(SCALE_PRESETS), default="demo",
                        help="規模のプリセット (default: demo)")
    parser.add_argument("--products", type=int, default=None,
                        help="商品数の目標。デモセットを含む合計。--scale より優先")
    parser.add_argument("--reviews-per-product", type=int, default=None,
                        help="追加商品1件あたりの平均口コミ数。--scale より優先")
    parser.add_argument("--seed", type=int, default=20260815,
                        help="追加データ生成の乱数シード (default: 20260815)")
    args = parser.parse_args()
    preset_products, preset_reviews = SCALE_PRESETS[args.scale]
    if args.products is None:
        args.products = preset_products
    if args.reviews_per_product is None:
        args.reviews_per_product = preset_reviews if preset_reviews else 4
    return args


ARGS = parse_args()

random.seed(20260815)

LIP_INGREDIENTS = [
    "HYDROGENATED POLYISOBUTENE", "DIISOSTEARYL MALATE", "POLYETHYLENE",
    "MICROCRYSTALLINE WAX", "CANDELILLA WAX", "OCTYLDODECANOL", "CERA ALBA",
    "PHYTOSTERYL/OCTYLDODECYL LAUROYL GLUTAMATE", "TOCOPHEROL", "JOJOBA ESTERS",
    "RICINUS COMMUNIS SEED OIL", "SILICA", "TRIMETHYLSILOXYSILICATE",
    "ISODODECANE", "DIMETHICONE", "SYNTHETIC FLUORPHLOGOPITE", "MICA",
    "SIMMONDSIA CHINENSIS SEED OIL", "SQUALANE", "SHEA BUTTER ETHYL ESTERS",
    "POLYGLYCERYL-2 TRIISOSTEARATE", "CAPRYLIC/CAPRIC TRIGLYCERIDE",
    "TITANIUM DIOXIDE", "CI 15850", "CI 45410", "CI 77491", "CI 77891",
    "CI 19140", "CI 42090", "TOCOPHERYL ACETATE", "HYALURONIC ACID",
]

FOUNDATION_INGREDIENTS = [
    "WATER", "CYCLOPENTASILOXANE", "ETHYLHEXYL METHOXYCINNAMATE",
    "TITANIUM DIOXIDE", "GLYCERIN", "PEG-10 DIMETHICONE", "TALC",
    "BUTYLENE GLYCOL", "SODIUM CHLORIDE", "IRON OXIDES", "PHENOXYETHANOL",
    "TOCOPHEROL", "ALUMINUM HYDROXIDE", "TRIETHOXYCAPRYLYLSILANE",
    "ZINC OXIDE", "DISTEARDIMONIUM HECTORITE", "SQUALANE", "HYALURONIC ACID",
    "DIMETHICONE", "SILICA", "MICA", "ISODODECANE", "LAURYL PEG-9 POLYDIMETHYLSILOXYETHYL DIMETHICONE",
    "METHICONE", "GLYCERYL CAPRYLATE", "CI 77491", "CI 77492", "CI 77499",
    "ASCORBYL GLUCOSIDE", "NIACINAMIDE", "PANTHENOL", "CITRIC ACID",
]

SHAMPOO_INGREDIENTS = [
    "WATER", "SODIUM LAURETH SULFATE", "COCAMIDOPROPYL BETAINE", "COCAMIDE MEA",
    "GLYCERIN", "SODIUM CHLORIDE", "CITRIC ACID", "MENTHOL", "PIROCTONE OLAMINE",
    "ZINC PYRITHIONE", "SALICYLIC ACID", "PANTHENOL", "HYDROLYZED KERATIN",
    "ARGANIA SPINOSA KERNEL OIL", "POLYQUATERNIUM-10", "DIMETHICONE",
    "FRAGRANCE", "PHENOXYETHANOL", "SODIUM BENZOATE", "DISODIUM EDTA",
    "LAURAMIDOPROPYL BETAINE", "SODIUM COCOYL GLUTAMATE", "GLYCOL DISTEARATE",
    "MENTHYL LACTATE", "CAMELLIA SINENSIS LEAF EXTRACT", "BIOTIN",
    "ISOPROPYL METHYLPHENOL", "SODIUM HYALURONATE", "TOCOPHEROL", "BUTYLENE GLYCOL",
]

TREATMENT_INGREDIENTS = [
    "WATER", "CETEARYL ALCOHOL", "BEHENTRIMONIUM CHLORIDE", "DIMETHICONE",
    "GLYCERIN", "AMODIMETHICONE", "STEARYL ALCOHOL", "ISOPROPYL MYRISTATE",
    "HYDROLYZED KERATIN", "ARGANIA SPINOSA KERNEL OIL", "PANTHENOL",
    "FRAGRANCE", "PHENOXYETHANOL", "CITRIC ACID", "BUTYLENE GLYCOL",
    "SHEA BUTTER ETHYL ESTERS", "TOCOPHEROL", "SODIUM HYALURONATE",
]

EYESHADOW_INGREDIENTS = [
    "TALC", "MICA", "SYNTHETIC FLUORPHLOGOPITE", "DIMETHICONE", "SILICA",
    "ZINC STEARATE", "CALCIUM ALUMINUM BOROSILICATE", "OCTYLDODECANOL",
    "CAPRYLIC/CAPRIC TRIGLYCERIDE", "MAGNESIUM MYRISTATE", "BORON NITRIDE",
    "TIN OXIDE", "TOCOPHEROL", "PHENOXYETHANOL", "TITANIUM DIOXIDE",
    "CI 77491", "CI 77492", "CI 77499", "CI 77891", "CI 15850", "CI 42090",
]

JA_NAMES = {
    "WATER": "水", "GLYCERIN": "グリセリン", "DIMETHICONE": "ジメチコン",
    "TITANIUM DIOXIDE": "酸化チタン", "MICA": "マイカ", "TALC": "タルク",
    "SQUALANE": "スクワラン", "TOCOPHEROL": "トコフェロール",
    "PHENOXYETHANOL": "フェノキシエタノール", "FRAGRANCE": "香料",
    "MENTHOL": "メントール", "NIACINAMIDE": "ナイアシンアミド",
    "PANTHENOL": "パンテノール", "HYALURONIC ACID": "ヒアルロン酸",
    "SODIUM LAURETH SULFATE": "ラウレス硫酸Na",
    "COCAMIDOPROPYL BETAINE": "コカミドプロピルベタイン",
    "ZINC PYRITHIONE": "ピロクトンオラミン系(ジンクピリチオン)",
    "PIROCTONE OLAMINE": "ピロクトンオラミン",
    "SALICYLIC ACID": "サリチル酸", "CITRIC ACID": "クエン酸",
    "ZINC OXIDE": "酸化亜鉛", "IRON OXIDES": "酸化鉄",
}

FUNCTIONS = {
    "WATER": ["base"], "GLYCERIN": ["humectant"], "DIMETHICONE": ["emollient", "silicone"],
    "TITANIUM DIOXIDE": ["uv", "pigment"], "ZINC OXIDE": ["uv", "pigment"],
    "SODIUM LAURETH SULFATE": ["surfactant"], "COCAMIDOPROPYL BETAINE": ["surfactant"],
    "PIROCTONE OLAMINE": ["anti-dandruff"], "ZINC PYRITHIONE": ["anti-dandruff"],
    "SALICYLIC ACID": ["exfoliant"], "MENTHOL": ["sensory"], "FRAGRANCE": ["fragrance"],
    "PHENOXYETHANOL": ["preservative"], "TOCOPHEROL": ["antioxidant"],
    "NIACINAMIDE": ["brightening"], "PANTHENOL": ["conditioning"],
}

HAZARD = {
    "FRAGRANCE": ["sensitive-skin"],
    "SODIUM LAURETH SULFATE": ["harsh-surfactant"],
    "ZINC PYRITHIONE": ["restricted-eu"],
    "MENTHOL": ["sensitive-skin"],
    "ETHYLHEXYL METHOXYCINNAMATE": ["sensitive-skin"],
}

ALL_INGREDIENTS = []
for pool in (LIP_INGREDIENTS, FOUNDATION_INGREDIENTS, SHAMPOO_INGREDIENTS,
             TREATMENT_INGREDIENTS, EYESHADOW_INGREDIENTS):
    for ing in pool:
        if ing not in ALL_INGREDIENTS:
            ALL_INGREDIENTS.append(ing)
assert len(ALL_INGREDIENTS) <= 256, len(ALL_INGREDIENTS)

BRANDS = [
    ("LUMINA", False), ("SERAFI", False), ("PLUME", False), ("KIRA COSME", False),
    ("mode noir", False), ("PRICO", False), ("DAILY+", False), ("Nuance", False),
    ("GRIT", True), ("HARDSCALP", True), ("CLEAR BASE", True), ("STOIC", True),
]

LIP_SHADES = [
    ("01 ベアヌード", "#C98A78"), ("02 ローズブラウン", "#A85F5A"),
    ("03 テラコッタ", "#B8604A"), ("04 モーヴピンク", "#B96C81"),
    ("05 レッドブリック", "#9E3B33"), ("06 コーラルオレンジ", "#D96A4B"),
    ("07 ダークプラム", "#7A3348"), ("08 ミルクティー", "#C79A82"),
]

FOUNDATION_SHADES = [
    ("100 ライトオークル", "#E8C4A2"), ("200 ナチュラルオークル", "#DDB18C"),
    ("300 オークル", "#D2A177"), ("400 ベージュオークル", "#C79268"),
    ("500 ディープオークル", "#B57F55"),
]


def jitter(hex_color: str, amount: int) -> str:
    r = int(hex_color[1:3], 16)
    g = int(hex_color[3:5], 16)
    b = int(hex_color[5:7], 16)
    out = []
    for c in (r, g, b):
        c = max(0, min(255, c + random.randint(-amount, amount)))
        out.append(c)
    return "#%02X%02X%02X" % tuple(out)


def sql_str(value):
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def sql_text_array(items):
    return "array[" + ", ".join(sql_str(i) for i in items) + "]::text[]"


products = []
jan_counter = 4901234000000


def add_product(brand, name, category, price, volume, unit, ingredients,
                shades=None, is_mens=False):
    """shades: [(色名, HEX)]。アイシャドウパレットのような複数色商品もここで表す。"""
    global jan_counter
    jan_counter += 7
    shades = shades or []
    products.append({
        "brand": brand, "name": name, "category": category, "price": price,
        "volume": volume, "unit": unit, "ingredients": ingredients,
        "shades": shades, "hex": shades[0][1] if shades else None,
        "is_mens": is_mens, "jan": str(jan_counter),
    })


def lip_formula(base_order, pigments, noise=0):
    """base_order: 共通ベース。noise 個だけ順序を入れ替えて処方差を作る。"""
    formula = list(base_order)
    for _ in range(noise):
        i = random.randrange(0, len(formula) - 1)
        formula[i], formula[i + 1] = formula[i + 1], formula[i]
    return formula + pigments


# --- リップ ------------------------------------------------------------------
LIP_BASE_A = [
    "HYDROGENATED POLYISOBUTENE", "DIISOSTEARYL MALATE", "POLYETHYLENE",
    "MICROCRYSTALLINE WAX", "CANDELILLA WAX", "OCTYLDODECANOL",
    "PHYTOSTERYL/OCTYLDODECYL LAUROYL GLUTAMATE", "JOJOBA ESTERS",
    "SQUALANE", "TOCOPHEROL",
]
LIP_BASE_B = [
    "ISODODECANE", "TRIMETHYLSILOXYSILICATE", "DIMETHICONE", "SILICA",
    "POLYGLYCERYL-2 TRIISOSTEARATE", "CAPRYLIC/CAPRIC TRIGLYCERIDE",
    "SYNTHETIC FLUORPHLOGOPITE", "CERA ALBA", "TOCOPHERYL ACETATE",
]

lip_specs = [
    # (brand, 商品名, 価格, base, shade index, 色ずれ幅)
    ("LUMINA", "グロウリップスティック", 3800, LIP_BASE_A, 2, 0),
    ("PRICO", "メルティリップ", 980, LIP_BASE_A, 2, 5),        # ← LUMINA の安い代替
    ("SERAFI", "ヴェルベットティント", 3200, LIP_BASE_B, 4, 0),
    ("DAILY+", "デイリーティント", 1100, LIP_BASE_B, 4, 6),     # ← SERAFI の安い代替
    ("PLUME", "シアーリップバーム", 2400, LIP_BASE_A, 0, 0),
    ("Nuance", "ニュアンスリップ", 1580, LIP_BASE_A, 3, 0),
    ("KIRA COSME", "シャインリップ", 2900, LIP_BASE_B, 5, 0),
    ("mode noir", "マットリップ", 4200, LIP_BASE_B, 6, 0),
    ("PRICO", "プチプラリップ", 750, LIP_BASE_A, 7, 0),
    ("DAILY+", "うるおいリップ", 890, LIP_BASE_A, 1, 0),
    ("Nuance", "モーヴティント", 1780, LIP_BASE_B, 3, 4),
    ("PLUME", "コーラルリップ", 2600, LIP_BASE_A, 5, 3),
]

for brand, name, price, base, shade_idx, dev in lip_specs:
    shade_name, shade_hex = LIP_SHADES[shade_idx]
    color = jitter(shade_hex, dev) if dev else shade_hex
    pigments = random.sample(["CI 15850", "CI 45410", "CI 77491", "CI 77891", "CI 19140", "CI 42090", "MICA", "TITANIUM DIOXIDE"], 4)
    add_product(brand, f"{name} {shade_name}", "lip", price, 3.5, "g",
                lip_formula(base, pigments, noise=1 if dev else 0), [(shade_name, color)])

# --- ファンデーション --------------------------------------------------------
FDN_BASE_A = [
    "WATER", "CYCLOPENTASILOXANE", "ETHYLHEXYL METHOXYCINNAMATE", "TITANIUM DIOXIDE",
    "GLYCERIN", "PEG-10 DIMETHICONE", "BUTYLENE GLYCOL", "TALC",
    "TRIETHOXYCAPRYLYLSILANE", "SODIUM CHLORIDE", "DISTEARDIMONIUM HECTORITE",
    "PHENOXYETHANOL", "TOCOPHEROL",
]
FDN_BASE_B = [
    "WATER", "DIMETHICONE", "TITANIUM DIOXIDE", "GLYCERIN", "ISODODECANE",
    "LAURYL PEG-9 POLYDIMETHYLSILOXYETHYL DIMETHICONE", "SILICA", "ZINC OXIDE",
    "SQUALANE", "NIACINAMIDE", "PANTHENOL", "METHICONE", "PHENOXYETHANOL",
]

fdn_specs = [
    ("LUMINA", "スキンフィットファンデーション", 6200, FDN_BASE_A, 1, 0),
    ("PRICO", "カバーリキッド", 1480, FDN_BASE_A, 1, 4),        # ← LUMINA の安い代替
    ("mode noir", "セラムファンデーション", 7800, FDN_BASE_B, 2, 0),
    ("DAILY+", "デイリークッション", 1980, FDN_BASE_B, 2, 5),    # ← mode noir の安い代替
    ("SERAFI", "ライトカバークッション", 4800, FDN_BASE_B, 0, 0),
    ("KIRA COSME", "ツヤ肌ファンデ", 3600, FDN_BASE_A, 3, 0),
    ("Nuance", "マットファンデ", 2800, FDN_BASE_A, 4, 0),
    ("PLUME", "グロウクッション", 5200, FDN_BASE_B, 1, 8),
    ("PRICO", "ミネラルパウダーファンデ", 1280, FDN_BASE_A, 0, 6),
    ("DAILY+", "BBクリーム", 1180, FDN_BASE_B, 3, 6),
]

for brand, name, price, base, shade_idx, dev in fdn_specs:
    shade_name, shade_hex = FOUNDATION_SHADES[shade_idx]
    color = jitter(shade_hex, dev) if dev else shade_hex
    extra = random.sample(["CI 77491", "CI 77492", "CI 77499", "MICA", "ALUMINUM HYDROXIDE", "CITRIC ACID"], 4)
    add_product(brand, f"{name} {shade_name}", "foundation", price, 30, "mL",
                base + extra, [(shade_name, color)])

# --- メンズシャンプー --------------------------------------------------------
SHAMPOO_BASE_A = [
    "WATER", "SODIUM LAURETH SULFATE", "COCAMIDOPROPYL BETAINE", "COCAMIDE MEA",
    "GLYCERIN", "PIROCTONE OLAMINE", "MENTHOL", "SALICYLIC ACID",
    "POLYQUATERNIUM-10", "SODIUM CHLORIDE", "CITRIC ACID", "FRAGRANCE",
    "PHENOXYETHANOL", "DISODIUM EDTA",
]
SHAMPOO_BASE_B = [
    "WATER", "SODIUM COCOYL GLUTAMATE", "LAURAMIDOPROPYL BETAINE", "GLYCERIN",
    "HYDROLYZED KERATIN", "PANTHENOL", "ARGANIA SPINOSA KERNEL OIL",
    "CAMELLIA SINENSIS LEAF EXTRACT", "SODIUM HYALURONATE", "BUTYLENE GLYCOL",
    "CITRIC ACID", "SODIUM BENZOATE", "FRAGRANCE",
]

shampoo_specs = [
    ("GRIT", "スカルプシャンプー クール", 3300, SHAMPOO_BASE_A, 0),
    ("CLEAR BASE", "薬用スカルプ", 980, SHAMPOO_BASE_A, 1),     # ← GRIT の安い代替
    ("HARDSCALP", "デオスカルプシャンプー", 4200, SHAMPOO_BASE_A, 1),
    ("STOIC", "アミノ酸シャンプー", 3800, SHAMPOO_BASE_B, 0),
    ("CLEAR BASE", "アミノ酸デイリー", 1180, SHAMPOO_BASE_B, 1),  # ← STOIC の安い代替
    ("GRIT", "ボリュームアップシャンプー", 2980, SHAMPOO_BASE_B, 1),
    ("HARDSCALP", "フケ・かゆみ対策シャンプー", 2480, SHAMPOO_BASE_A, 1),
    ("STOIC", "ミントスカルプ", 2200, SHAMPOO_BASE_A, 1),
]

for brand, name, price, base, noise in shampoo_specs:
    formula = list(base)
    for _ in range(noise):
        i = random.randrange(0, len(formula) - 1)
        formula[i], formula[i + 1] = formula[i + 1], formula[i]
    if "ZINC PYRITHIONE" not in formula and random.random() < 0.4:
        formula.insert(6, "ZINC PYRITHIONE")
    add_product(brand, name, "shampoo", price, 400, "mL", formula, is_mens=True)

TREATMENT_SPECS = [
    ("GRIT", "スカルプトリートメント", 3300, 0),
    ("CLEAR BASE", "デイリートリートメント", 880, 2),
    ("STOIC", "リペアトリートメント", 3600, 1),
    ("HARDSCALP", "クールトリートメント", 2600, 2),
]
for brand, name, price, noise in TREATMENT_SPECS:
    formula = list(TREATMENT_INGREDIENTS)
    for _ in range(noise):
        i = random.randrange(0, len(formula) - 1)
        formula[i], formula[i + 1] = formula[i + 1], formula[i]
    add_product(brand, name, "treatment", price, 400, "g", formula, is_mens=True)


# --- アイシャドウパレット ------------------------------------------------------
# 1 商品 = 複数色。「パレットの何色が手持ちで再現できるか」を見せるためのデータ。
EYE_BASE_A = [
    "TALC", "MICA", "SYNTHETIC FLUORPHLOGOPITE", "DIMETHICONE", "SILICA",
    "ZINC STEARATE", "OCTYLDODECANOL", "CAPRYLIC/CAPRIC TRIGLYCERIDE",
    "BORON NITRIDE", "TOCOPHEROL", "PHENOXYETHANOL",
]
EYE_BASE_B = [
    "MICA", "TALC", "CALCIUM ALUMINUM BOROSILICATE", "SYNTHETIC FLUORPHLOGOPITE",
    "MAGNESIUM MYRISTATE", "DIMETHICONE", "TIN OXIDE", "SILICA",
    "OCTYLDODECANOL", "TOCOPHEROL", "PHENOXYETHANOL",
]

BROWN_PALETTE = [
    ("ベース", "#E8D3C2"), ("ミルクベージュ", "#D9B999"), ("ライトブラウン", "#B98A62"),
    ("テラコッタ", "#B8604A"), ("ローズブラウン", "#A85F5A"), ("ブリック", "#9E3B33"),
    ("ダークブラウン", "#6E4630"), ("シマーゴールド", "#D9A441"), ("プラム", "#7A3348"),
]
PINK_PALETTE = [
    ("シアーピンク", "#EFD2D2"), ("ベビーピンク", "#E3A9AE"), ("モーヴ", "#B96C81"),
    ("コーラル", "#D96A4B"), ("ワインレッド", "#8E2F3E"), ("シルバー", "#C9C5C1"),
]

eye_specs = [
    ("LUMINA", "デイリーアイパレット 01 ブラウンベージュ", 6800, EYE_BASE_A, BROWN_PALETTE, 0),
    # ↓ LUMINA とほぼ同じ配色・処方の安いパレット
    ("PRICO", "9色アイパレット 01 ブラウン", 1480, EYE_BASE_A, BROWN_PALETTE, 5),
    ("mode noir", "クチュールアイパレット 02 モーヴ", 8200, EYE_BASE_B, PINK_PALETTE, 0),
    ("DAILY+", "6色アイパレット 02 ピンク", 1280, EYE_BASE_B, PINK_PALETTE, 6),
]

for brand, name, price, base, palette, dev in eye_specs:
    shades = [(shade, jitter(hex_color, dev) if dev else hex_color) for shade, hex_color in palette]
    pigments = random.sample(["CI 77491", "CI 77492", "CI 77499", "CI 77891", "CI 15850", "CI 42090"], 4)
    formula = list(base)
    for _ in range(1 if dev else 0):
        i = random.randrange(0, len(formula) - 1)
        formula[i], formula[i + 1] = formula[i + 1], formula[i]
    add_product(brand, name, "eyeshadow", price, round(len(shades) * 1.2, 1), "g",
                formula + pigments, shades)


# --- 口コミ ------------------------------------------------------------------
# 「サクラが湧いている商品」を1つ作る。文体が近い / 同日バースト / 同ブランド偏重 / PR表記 / 画像使い回し。
SAKURA_TARGET_BRAND = "mode noir"
SAKURA_TARGET_NAME = "セラムファンデーション"

HONEST_REVIEWS = [
    ("mikan_88", 4, "カバー力は十分。ただ夕方は小鼻がよれるので部分的にパウダーがいる。"),
    ("kt_no_diary", 3, "色は合うけど乾燥する。冬は下地を保湿系にしないと厳しかった。"),
    ("sekkachi", 5, "崩れにくさは今まで使った中で一番。値段は高いが減りは遅い。"),
    ("yuu_cosme", 2, "自分の肌には黄みが強すぎた。首との差が出る。"),
    ("nagi_r", 4, "少量で伸びる。マスクにはそこそこ着く。"),
]

SAKURA_REVIEWS = [
    ("pr_account_a", 5, "本当に神コスメすぎる！朝塗ったら夜まで崩れない！みんな買って！ #pr", "phash_aaa111"),
    ("pr_account_b", 5, "まじで神コスメすぎる！朝塗ったら夜まで崩れないです！みんな買うべき！", "phash_aaa111"),
    ("pr_account_c", 5, "神コスメすぎました！朝塗って夜まで崩れない！絶対買って！", "phash_bbb222"),
    ("brand_fan_1", 5, "このブランドは全部良い。今回も最高でした。提供いただきました。", None),
    ("brand_fan_1", 5, "やっぱりこのブランドは裏切らない。リピート確定です。", None),
    ("brand_fan_1", 5, "何度もリピートしています。文句なしの品質。", None),
]

# --- 規模を増やす分（--scale / --products） --------------------------------
# デモセットと同じ性質（被りが出る商品 / 安い代替が出る商品 / サクラが湧いた商品）を
# 手続き的に量産する。デモセットの出力を変えないため、乱数は別インスタンスを使う。
CATEGORY_BASES = {
    "lip": ([LIP_BASE_A, LIP_BASE_B], LIP_SHADES,
            ["CI 15850", "CI 45410", "CI 77491", "CI 77891", "CI 19140", "CI 42090", "MICA", "TITANIUM DIOXIDE"],
            (3.5, "g"), (900, 5200)),
    "foundation": ([FDN_BASE_A, FDN_BASE_B], FOUNDATION_SHADES,
                   ["CI 77491", "CI 77492", "CI 77499", "MICA", "ALUMINUM HYDROXIDE", "CITRIC ACID"],
                   (30, "mL"), (1200, 8200)),
    "eyeshadow": ([EYE_BASE_A, EYE_BASE_B], None,
                  ["CI 77491", "CI 77492", "CI 77499", "CI 77891", "CI 15850", "CI 42090"],
                  (9.6, "g"), (1200, 8800)),
    "shampoo": ([SHAMPOO_BASE_A, SHAMPOO_BASE_B], None,
                ["ZINC PYRITHIONE", "ISOPROPYL METHYLPHENOL", "BIOTIN", "MENTHYL LACTATE", "GLYCOL DISTEARATE"],
                (400, "mL"), (880, 4400)),
    "treatment": ([TREATMENT_INGREDIENTS], None,
                  ["ISOPROPYL MYRISTATE", "AMODIMETHICONE", "SHEA BUTTER ETHYL ESTERS", "SODIUM HYALURONATE"],
                  (400, "g"), (880, 3800)),
}
EXTRA_CATEGORIES = ["lip", "foundation", "eyeshadow", "shampoo", "treatment"]
MENS_CATEGORIES = {"shampoo", "treatment"}

BRAND_HEADS = ["AURA", "MELT", "CIEL", "NOIRE", "PETIT", "LUXE", "CALM", "SHEER",
               "VIVID", "MUTE", "BLOOM", "SOLID", "PURE", "GLOSSY", "URBAN", "SILK"]
BRAND_TAILS = ["cosme", "beauté", "lab", "tokyo", "atelier", "works", "base", "studio"]

EXTRA_NAME_HEADS = {
    "lip": ["ティント", "リップスティック", "リップバーム", "リップグロス"],
    "foundation": ["リキッドファンデ", "クッションファンデ", "パウダーファンデ", "BBクリーム"],
    "eyeshadow": ["アイパレット", "アイシャドウパレット"],
    "shampoo": ["スカルプシャンプー", "アミノ酸シャンプー", "薬用シャンプー"],
    "treatment": ["トリートメント", "リペアトリートメント", "スカルプトリートメント"],
}

REVIEW_SENTENCES = [
    "伸びは良いけれど夕方には少しよれる。", "色の出方は写真より落ち着いている。",
    "香りが控えめで使いやすかった。", "量が多くて減りが遅いのは助かる。",
    "乾燥する日は下地を保湿系に変えないと厳しい。", "落ちにくさは値段なりだと思う。",
    "同じ系統を持っていたので買う必要はなかった。", "肌に合わなかったのか少し赤くなった。",
    "パッケージは安っぽいが中身は悪くない。", "リピートするか迷う微妙な使用感。",
    "指で伸ばすと発色が均一になった。", "重ね付けすると濃さの調整がしやすい。",
    "洗い上がりはさっぱりだが軋みは少ない。", "詰め替えがある点は評価したい。",
    "夏場はテカリが早めに出てくる。", "冬でも硬くならないテクスチャだった。",
    "唇の皮が剥けている時は色ムラが出る。", "高い方と並べても違いが分からなかった。",
    "毛穴落ちは思ったより気にならない。", "マスクにはそれなりに移る。",
    "頭皮のかゆみは減った気がする。", "きしむので後にトリートメントが必要。",
    "ラメの飛び散りが少なくて良い。", "捨て色がなく使い切れそう。",
]

SAKURA_TEMPLATES = [
    "本当に神コスメすぎる！朝塗ったら夜まで崩れない！みんな買って！ #pr",
    "まじで神コスメすぎる！朝塗ったら夜まで崩れないです！みんな買うべき！",
    "神コスメすぎました！朝塗って夜まで崩れない！絶対買って！",
]

extra_brands = []
extra_reviews = []  # (product_index, author_key, rating, body, phash, days_ago)


def build_extra_brands(count):
    names = []
    seen = set()
    i = 0
    while len(names) < count:
        name = "%s %s" % (BRAND_HEADS[i % len(BRAND_HEADS)], BRAND_TAILS[(i // len(BRAND_HEADS)) % len(BRAND_TAILS)])
        if i >= len(BRAND_HEADS) * len(BRAND_TAILS):
            name = "%s %02d" % (name, i)
        if name not in seen:
            seen.add(name)
            names.append(name)
        i += 1
    return names


def extra_palette(rng, category, dev):
    """カテゴリごとの色。色を持たないカテゴリは空リスト。"""
    if category == "eyeshadow":
        palette = rng.choice([BROWN_PALETTE, PINK_PALETTE])
        return [(shade, jitter_with(rng, hex_color, dev) if dev else hex_color)
                for shade, hex_color in palette]
    shades = CATEGORY_BASES[category][1]
    if not shades:
        return []
    shade_name, shade_hex = rng.choice(shades)
    return [(shade_name, jitter_with(rng, shade_hex, dev) if dev else shade_hex)]


def jitter_with(rng, hex_color, amount):
    out = []
    for i in (1, 3, 5):
        c = int(hex_color[i:i + 2], 16)
        out.append(max(0, min(255, c + rng.randint(-amount, amount))))
    return "#%02X%02X%02X" % tuple(out)


def swap_noise(rng, formula, times):
    formula = list(formula)
    for _ in range(times):
        i = rng.randrange(0, len(formula) - 1)
        formula[i], formula[i + 1] = formula[i + 1], formula[i]
    return formula


def add_extra_products(rng, target_total):
    """target_total 件になるまで、被り・代替が出る家族と単独商品を足す。"""
    brands = build_extra_brands(max(12, target_total // 8))
    extra_brands.extend(brands)
    family_idx = 0
    while len(products) < target_total:
        family_idx += 1
        category = EXTRA_CATEGORIES[family_idx % len(EXTRA_CATEGORIES)]
        bases, _, pigments, (volume, unit), (low, high) = CATEGORY_BASES[category]
        base = rng.choice(bases)
        head = rng.choice(EXTRA_NAME_HEADS[category])
        anchor_price = rng.randrange(low + (high - low) // 2, high, 10)
        # 3家族に1つは単独商品（被りが出ない商品も必要）。残りは安い代替を持つ家族。
        if family_idx % 3 == 0:
            members = [(anchor_price, 0, len(base))]
        else:
            members = [(anchor_price, 0, 0)]
            for _ in range(rng.randint(1, 2)):
                members.append((max(low, int(anchor_price * rng.uniform(0.2, 0.45)) // 10 * 10),
                                rng.randint(3, 6), 1))
        shades = extra_palette(rng, category, 0)
        for price, dev, noise in members:
            if len(products) >= target_total:
                break
            brand = brands[rng.randrange(len(brands))]
            if noise >= len(base):  # 単独商品は配合順ごと入れ替えて処方を離す
                formula = list(base)
                rng.shuffle(formula)
                member_shades = extra_palette(rng, category, 24)
            else:
                formula = swap_noise(rng, base, noise)
                member_shades = [(name, jitter_with(rng, hex_color, dev) if dev else hex_color)
                                 for name, hex_color in shades]
            formula = formula + rng.sample(pigments, min(3, len(pigments)))
            add_product(brand, "%s %02d-%d" % (head, family_idx, price % 97), category,
                        price, volume, unit, formula, member_shades,
                        is_mens=category in MENS_CATEGORIES)


def add_extra_reviews(rng, first_extra_index, avg_reviews):
    """普通の口コミ + 12商品に1つはサクラのクラスタ。"""
    for idx in range(first_extra_index, len(products) + 1):
        count = max(0, min(len(REVIEW_SENTENCES) // 2, int(rng.gauss(avg_reviews, avg_reviews / 2))))
        bodies = rng.sample(REVIEW_SENTENCES, max(count, 1) * 2)
        for n in range(count):
            # 投稿者は使い回さない（同ブランド偏重の判定に引っかからないようにする）
            extra_reviews.append((idx, "u%06d" % len(extra_reviews),
                                  rng.choice([2, 3, 3, 4, 4, 5]),
                                  bodies[2 * n] + bodies[2 * n + 1], None,
                                  9 + n * 7 + rng.randrange(0, 5)))
        if idx % 12 == 0:
            phash = "phash_gen_%05d" % idx
            for n, body in enumerate(SAKURA_TEMPLATES):
                extra_reviews.append((idx, "pr_gen_%05d_%d" % (idx, n), 5, body, phash, 0))


if ARGS.products > len(products):
    extra_rng = random.Random(ARGS.seed)
    first_extra_index = len(products) + 1
    add_extra_products(extra_rng, ARGS.products)
    add_extra_reviews(extra_rng, first_extra_index, ARGS.reviews_per_product)


lines = []
w = lines.append


def emit_insert(header, rows, chunk=1000):
    """行数が多いと 1 文が巨大になるので分割して出す。"""
    for start in range(0, len(rows), chunk):
        w(header)
        w(",\n".join(rows[start:start + chunk]) + ";")


w("-- 自動生成: python3 scripts/generate_seed.py > supabase/seed.sql")
w("-- 実在ブランドの成分表は転載していない。ブランド名・商品名・口コミはすべて架空のデモデータ。")
if extra_reviews or ARGS.products > 0:
    w("-- scale=%s products=%d reviews=%d seed=%d" % (
        ARGS.scale, len(products), len(extra_reviews), ARGS.seed))
w("")
w("truncate table reviews, user_items, product_colors, products, brands, ingredients_master restart identity cascade;")
w("")
w("insert into ingredients_master (dim, inci, name_ja, functions, hazard_tags) values")
rows = []
for idx, ing in enumerate(ALL_INGREDIENTS, start=1):
    rows.append("  (%d, %s, %s, %s, %s)" % (
        idx, sql_str(ing), sql_str(JA_NAMES.get(ing)),
        sql_text_array(FUNCTIONS.get(ing, [])), sql_text_array(HAZARD.get(ing, []))))
w(",\n".join(rows) + ";")
w("")

emit_insert("insert into brands (name) values",
            ["  (%s)" % sql_str(b) for b, _ in BRANDS]
            + ["  (%s)" % sql_str(b) for b in extra_brands])
w("")

rows = []
for p in products:
    rows.append("  ((select id from brands where name = %s), %s, %s, %s, %d, %s, %s, %s, %s, %s)" % (
        sql_str(p["brand"]), sql_str(p["name"]), sql_str(p["category"]),
        sql_str(p["is_mens"]), p["price"], sql_str(p["volume"]), sql_str(p["unit"]),
        sql_str(p["jan"]), sql_str(p["hex"]), sql_text_array(p["ingredients"])))
emit_insert("insert into products (brand_id, name, category, is_mens, price_yen, volume, volume_unit, jan, color_hex, ingredients) values", rows)
w("")

rows = []
for idx, p in enumerate(products, start=1):
    for pos, (shade_name, shade_hex) in enumerate(p["shades"]):
        rows.append("  (%d, %d, %s, %s)" % (idx, pos, sql_str(shade_name), sql_str(shade_hex)))
emit_insert("insert into product_colors (product_id, pos, shade_name, hex) values", rows)
w("")

if extra_reviews:
    # 1 件ずつ trigger で商品全体を再判定すると件数の2乗で遅くなる。
    # 投入中は止めて、最後の recompute_review_trust でまとめて判定する。
    w("alter table reviews disable trigger reviews_recompute;")
    w("")
rows = []
target_ref = "(select p.id from products p join brands b on b.id = p.brand_id where b.name = %s and p.name like %s limit 1)" % (
    sql_str(SAKURA_TARGET_BRAND), sql_str(SAKURA_TARGET_NAME + "%"))
for i, (key, rating, body) in enumerate(HONEST_REVIEWS):
    rows.append("  (%s, %s, %s, %d, %s, null, now() - interval '%d days')" % (
        target_ref, sql_str(key), sql_str(key), rating, sql_str(body), 40 - i * 6))
for i, (key, rating, body, phash) in enumerate(SAKURA_REVIEWS):
    rows.append("  (%s, %s, %s, %d, %s, %s, now() - interval '%d hours')" % (
        target_ref, sql_str(key), sql_str(key), rating, sql_str(body), sql_str(phash), 20 - i))
# 同ブランド偏重を成立させるため、brand_fan_1 は同ブランドの別商品にも満点を置く
other_ref = "(select p.id from products p join brands b on b.id = p.brand_id where b.name = 'mode noir' and p.name like 'マットリップ%' limit 1)"
rows.append("  (%s, 'brand_fan_1', 'brand_fan_1', 5, 'このブランドは全部良い。文句なし。', null, now() - interval '3 days')" % other_ref)
# 他商品にも普通の口コミを少し
normal_ref = "(select p.id from products p join brands b on b.id = p.brand_id where b.name = 'PRICO' and p.name like 'カバーリキッド%' limit 1)"
rows.append("  (%s, 'mikan_88', 'mikan_88', 4, '値段の割にちゃんと隠れる。崩れ方は値段なり。', null, now() - interval '10 days')" % normal_ref)
rows.append("  (%s, 'nagi_r', 'nagi_r', 4, '高いやつと並べても正直違いが分からなかった。', null, now() - interval '5 days')" % normal_ref)
for product_idx, key, rating, body, phash, days_ago in extra_reviews:
    rows.append("  (%d, %s, %s, %d, %s, %s, now() - interval '%d days')" % (
        product_idx, sql_str(key), sql_str(key), rating, sql_str(body), sql_str(phash), days_ago))
emit_insert("insert into reviews (product_id, author_name, author_key, rating, body, image_phash, posted_at) values", rows)
w("")
if extra_reviews:
    w("alter table reviews enable trigger reviews_recompute;")
    w("")
w("-- IDF を数え直して成分ベクトルを再生成")
w("select refresh_ingredient_idf();")
w("")
w("-- 不正判定を初期化")
w("select recompute_review_trust(id) from products;")

print("\n".join(lines))
