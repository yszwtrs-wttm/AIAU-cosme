import Link from "next/link";
import { Search } from "lucide-react";
import { buildStashColorMap, colorMapSummary, type ColorZone, type ZoneCount } from "@/lib/colormap";
import type { Product } from "@/lib/types";
import { colorName } from "@/lib/wording";

const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = 138;
/** これ以上鮮やかな色は円の縁に置く。 */
const MAX_CHROMA = 70;

const scale = RADIUS / MAX_CHROMA;

function polar(hue: number, chroma: number) {
  const rad = (hue * Math.PI) / 180;
  const r = Math.min(chroma, MAX_CHROMA) * scale;
  return { x: CENTER + r * Math.cos(rad), y: CENTER - r * Math.sin(rad) };
}

function sectorPath(zone: ColorZone) {
  const span = zone.from > zone.to ? zone.to + 360 - zone.from : zone.to - zone.from;
  const start = polar(zone.from, MAX_CHROMA);
  const end = polar(zone.from + span, MAX_CHROMA);
  const largeArc = span > 180 ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${start.x.toFixed(1)} ${start.y.toFixed(1)} A ${RADIUS} ${RADIUS} 0 ${largeArc} 0 ${end.x.toFixed(1)} ${end.y.toFixed(1)} Z`;
}

function zoneLabelPos(zone: ColorZone) {
  const span = zone.from > zone.to ? zone.to + 360 - zone.from : zone.to - zone.from;
  return polar(zone.from + span / 2, MAX_CHROMA * 0.72);
}

function searchHref(zone: ZoneCount) {
  return `/color?hex=${zone.sampleHex.replace("#", "")}`;
}

/**
 * 手持ちの色を CIELAB の a*–b* 平面（＝色相環と同じ向き）に散らして、
 * 密集しているゾーンと 1 点も無いゾーンを 1 画面で見せる。
 */
export default function ColorMap({ products }: { products: Product[] }) {
  const map = buildStashColorMap(products);
  const maxCount = Math.max(1, ...map.zones.map((z) => z.count));

  if (map.points.length === 0) return null;

  return (
    <section className="rounded-2xl border border-ink-200 bg-white p-5">
      <h2 className="font-display text-lg font-bold">手持ちの色マップ</h2>
      <p className="mt-1 text-sm font-bold text-brand-700">{colorMapSummary(map)}</p>
      <p className="mt-1 text-xs text-ink-400">
        リップ・アイシャドウ {map.points.length}色を、色みの近さで並べています。中心に近いほどくすんだ色、外
        側ほど鮮やかな色です。
      </p>

      <div className="mt-4 grid gap-5 lg:grid-cols-[320px_1fr]">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label="手持ちの色の分布図"
          className="mx-auto h-auto w-full max-w-[320px]"
        >
          {map.zones.map((zone) => (
            <path
              key={zone.id}
              d={sectorPath(zone)}
              fill={zone.count > 0 ? zone.sampleHex : "#ffffff"}
              fillOpacity={zone.count > 0 ? 0.14 + Math.min(0.3, (zone.count / maxCount) * 0.3) : 1}
              stroke="#e6dfe3"
              strokeWidth={1}
              strokeDasharray={zone.count === 0 ? "4 3" : undefined}
            />
          ))}

          {[20, 40, 60].map((c) => (
            <circle
              key={c}
              cx={CENTER}
              cy={CENTER}
              r={c * scale}
              fill="none"
              stroke="#efe8ec"
              strokeWidth={1}
            />
          ))}
          <line x1={CENTER - RADIUS} y1={CENTER} x2={CENTER + RADIUS} y2={CENTER} stroke="#e6dfe3" />
          <line x1={CENTER} y1={CENTER - RADIUS} x2={CENTER} y2={CENTER + RADIUS} stroke="#e6dfe3" />

          {[
            { x: SIZE - 6, y: CENTER - 6, text: "赤み", anchor: "end" as const },
            { x: 6, y: CENTER - 6, text: "緑み", anchor: "start" as const },
            { x: CENTER + 6, y: 12, text: "黄み", anchor: "start" as const },
            { x: CENTER + 6, y: SIZE - 6, text: "青み", anchor: "start" as const },
          ].map((axis) => (
            <text
              key={axis.text}
              x={axis.x}
              y={axis.y}
              textAnchor={axis.anchor}
              fontSize={10}
              fill="#a99fa6"
            >
              {axis.text}
            </text>
          ))}

          {map.zones.map((zone) => {
            const pos = zoneLabelPos(zone);
            return (
              <text
                key={`label-${zone.id}`}
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11}
                fontWeight={zone.count === 0 ? 400 : 700}
                fill={zone.count === 0 ? "#a99fa6" : "#4b4147"}
              >
                {zone.count}点
              </text>
            );
          })}

          {map.points.map((point, i) => {
            const pos = polar(point.hue, point.chroma);
            return (
              <circle
                key={`${point.productId}-${point.hex}-${i}`}
                cx={pos.x}
                cy={pos.y}
                r={7}
                fill={point.hex}
                stroke="#ffffff"
                strokeWidth={1.5}
              >
                <title>{`${point.label}（${colorName(point.hex)}）`}</title>
              </circle>
            );
          })}
        </svg>

        <div className="space-y-2">
          {[...map.zones]
            .sort((a, b) => b.count - a.count || b.priority - a.priority)
            .map((zone) => (
              <div key={zone.id} className="flex items-center gap-2 text-sm">
                <span
                  className="swatch inline-block h-5 w-5 shrink-0 rounded-full"
                  style={{ background: zone.sampleHex }}
                />
                <span className="w-32 shrink-0 truncate text-xs">{zone.label}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${(zone.count / maxCount) * 100}%`,
                      background: zone.sampleHex,
                    }}
                  />
                </span>
                <span className="w-9 shrink-0 text-right text-xs tabular-nums text-ink-600">
                  {zone.count}点
                </span>
                {zone.count === 0 && (
                  <Link
                    href={searchHref(zone)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full border border-brand-200 px-2 py-1 text-[11px] font-bold text-brand-700"
                  >
                    <Search size={12} /> 探す
                  </Link>
                )}
              </div>
            ))}

          {map.missing.length > 0 && (
            <div className="mt-3 rounded-2xl bg-brand-soft p-3">
              <div className="text-xs font-bold text-brand-700">持っていない色から探す</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {map.missing.slice(0, 3).map((zone) => (
                  <Link
                    key={zone.id}
                    href={searchHref(zone)}
                    className="flex items-center gap-2 rounded-full border border-brand-100 bg-white px-2.5 py-1.5 text-xs font-bold"
                  >
                    <span
                      className="swatch inline-block h-5 w-5 rounded-full"
                      style={{ background: zone.sampleHex }}
                    />
                    {zone.label}を探す
                  </Link>
                ))}
              </div>
            </div>
          )}

          {map.neutralCount > 0 && (
            <p className="text-[11px] text-ink-400">
              色みのほとんど無い{map.neutralCount}色（ベースやラメなど）は図から外しています。
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
