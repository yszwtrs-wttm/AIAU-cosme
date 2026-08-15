#!/usr/bin/env python3
"""デモ用シードデータ生成。

実在ブランドの成分表を無断転載しないため、ブランド名・商品名は架空。
成分リストは各カテゴリで実際に使われる INCI 名から構成し、
「配合順が近い＝処方が近い」という関係が数値に出るように組んである。

    python3 scripts/generate_seed.py > supabase/seed.sql
"""

import random

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

# --- 表記ゆれ ----------------------------------------------------------------
# 全成分表示の出どころによっては日本語表示名や慣用名で書かれている。
# 別名辞書（ingredient_aliases）が効いていれば、書き方が違っても同じ成分として扱われ、
# 安い代替の判定が崩れない。それをデモデータでも再現しておく。
JA_NOTATION = {
    "WATER": "精製水",
    "GLYCERIN": "グリセリン",
    "BUTYLENE GLYCOL": "BG",
    "TOCOPHEROL": "ビタミンE",
    "SQUALANE": "スクワラン",
    "MICA": "マイカ",
    "TITANIUM DIOXIDE": "酸化チタン",
    "PHENOXYETHANOL": "フェノキシエタノール",
    "HYDROGENATED POLYISOBUTENE": "水添ポリイソブテン",
    "CI 77491": "酸化鉄（赤）",
    "DIMETHICONE": "ジメチコン",
}
MIXED_NOTATION_PRODUCTS = ("メルティリップ", "カバーリキッド")

# 辞書に無い成分。管理画面（unresolved_ingredients）で拾って辞書を育てる対象になる。
UNKNOWN_INGREDIENTS = {
    "デイリーティント": "ツバキ種子油",
    "デイリークッション": "CI 77007",
}

for p in products:
    if p["name"].startswith(MIXED_NOTATION_PRODUCTS):
        p["ingredients"] = [JA_NOTATION.get(i, i) for i in p["ingredients"]]
    for prefix, unknown in UNKNOWN_INGREDIENTS.items():
        if p["name"].startswith(prefix):
            p["ingredients"] = p["ingredients"] + [unknown]

lines = []
w = lines.append
w("-- 自動生成: python3 scripts/generate_seed.py > supabase/seed.sql")
w("-- 実在ブランドの成分表は転載していない。ブランド名・商品名・口コミはすべて架空のデモデータ。")
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

w("insert into brands (name) values")
w(",\n".join("  (%s)" % sql_str(b) for b, _ in BRANDS) + ";")
w("")

w("insert into products (brand_id, name, category, is_mens, price_yen, volume, volume_unit, jan, color_hex, ingredients) values")
rows = []
for p in products:
    rows.append("  ((select id from brands where name = %s), %s, %s, %s, %d, %s, %s, %s, %s, %s)" % (
        sql_str(p["brand"]), sql_str(p["name"]), sql_str(p["category"]),
        sql_str(p["is_mens"]), p["price"], sql_str(p["volume"]), sql_str(p["unit"]),
        sql_str(p["jan"]), sql_str(p["hex"]), sql_text_array(p["ingredients"])))
w(",\n".join(rows) + ";")
w("")

w("insert into product_colors (product_id, pos, shade_name, hex) values")
rows = []
for idx, p in enumerate(products, start=1):
    for pos, (shade_name, shade_hex) in enumerate(p["shades"]):
        rows.append("  (%d, %d, %s, %s)" % (idx, pos, sql_str(shade_name), sql_str(shade_hex)))
w(",\n".join(rows) + ";")
w("")

w("insert into reviews (product_id, author_name, author_key, rating, body, image_phash, posted_at) values")
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
w(",\n".join(rows) + ";")
w("")
w("-- 別名辞書を投入（成分マスタの truncate で消えるため、シードのたびに入れ直す）")
w("select seed_ingredient_aliases();")
w("")
w("-- IDF を数え直して成分ベクトルを再生成")
w("select refresh_ingredient_idf();")
w("")
w("-- 不正判定を初期化")
w("select recompute_review_trust(id) from products;")

print("\n".join(lines))
