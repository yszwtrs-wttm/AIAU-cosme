"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Camera, Check, Flashlight, Search, SwitchCamera } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { addToStash } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";
import { CATEGORY_LABEL, type Product } from "@/lib/types";

type Status = "idle" | "scanning" | "found" | "unknown" | "error";

const COLUMNS =
  "id,name,category,is_mens,price_yen,volume,volume_unit,jan,image_url,color_hex,ingredients,brands(name),product_colors(pos,shade_name,hex)";

/** カメラが開けなかった理由ごとに、その場でできる復帰手順を出す。 */
function cameraErrorMessage(e: unknown): string {
  const name = e instanceof Error ? e.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "カメラの使用が許可されていません。iPhone は「設定 > Safari > カメラ」または画面左上の「ぁあ」>「Webサイトの設定」、Android Chrome はアドレスバーの鍵アイコン >「権限」からカメラを「許可」にして、ページを再読み込みしてください。バーコードの数字は手入力でも登録できます。";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "使えるカメラが見つかりませんでした。カメラのある端末で開くか、バーコードの数字を手入力してください。";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "カメラを他のアプリが使用中の可能性があります。カメラを使っているアプリやタブを閉じて、もう一度お試しください。";
  }
  return e instanceof Error ? `カメラを開けませんでした: ${e.message}` : "カメラを開けませんでした";
}

/**
 * 連続スキャン。1本ごとにカメラを止めず、読めたらそのまま登録して次に進める。
 * 「1個ずつ登録が面倒」を減らすのが目的。
 */
export default function BarcodeScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const busyRef = useRef(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [jan, setJan] = useState("");
  const [hit, setHit] = useState<Product | null>(null);
  const [candidates, setCandidates] = useState<Product[]>([]);
  const [registered, setRegistered] = useState<Product[]>([]);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [torchOn, setTorchOn] = useState(false);
  const [torchReady, setTorchReady] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => () => controlsRef.current?.stop(), []);

  const register = async (product: Product, source: "scan" | "manual") => {
    const res = await addToStash(product.id, source);
    if (!res.ok) {
      setMessage(res.error ?? "登録に失敗しました");
      return;
    }
    setRegistered((prev) => (prev.some((p) => p.id === product.id) ? prev : [...prev, product]));
  };

  const lookup = async (code: string, auto: boolean) => {
    setJan(code);
    const supabase = createClient();

    const { data } = await supabase.from("products").select(COLUMNS).eq("jan", code).maybeSingle<Product>();
    if (data) {
      setHit(data);
      setCandidates([]);
      setStatus("found");
      if (auto) await register(data, "scan");
      return;
    }

    // JAN マスタに無い場合は候補から手で選ばせる。ここで詰まらせないのが大事。
    const { data: all } = await supabase.from("products").select(COLUMNS).limit(60).returns<Product[]>();
    setHit(null);
    setCandidates(all ?? []);
    setStatus("unknown");
  };

  const start = async (preferredDeviceId?: string) => {
    setStatus("scanning");
    setMessage("");
    setTorchOn(false);
    setTorchReady(false);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setMessage(
        "この環境ではカメラを使えません。https:// で開いているか確認してください（http:// ではカメラが使えません）。バーコードの数字は手入力でも登録できます。",
      );
      return;
    }
    try {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.CODE_128]);
      const reader = new BrowserMultiFormatReader(hints);
      // 端末既定だとフロントカメラが選ばれることがあるので、背面カメラを明示的に要求する。
      const video: MediaTrackConstraints = preferredDeviceId
        ? { deviceId: { exact: preferredDeviceId } }
        : { facingMode: { ideal: "environment" } };
      const controls = await reader.decodeFromConstraints({ video, audio: false }, videoRef.current!, (result) => {
        if (!result || busyRef.current) return;
        busyRef.current = true;
        void lookup(result.getText(), true).finally(() => {
          // 同じコードを連続で拾わないよう、少し間を置いてから次を受け付ける。
          setTimeout(() => {
            busyRef.current = false;
          }, 1500);
        });
      });
      controlsRef.current = controls;
      setActive(true);
      setTorchReady(typeof controls.switchTorch === "function");
      setDeviceId(videoRef.current?.srcObject instanceof MediaStream
        ? videoRef.current.srcObject.getVideoTracks()[0]?.getSettings().deviceId
        : preferredDeviceId);
      // 許可後でないとラベルが取れないので、開いた後に一覧を作る。
      const list = await BrowserMultiFormatReader.listVideoInputDevices();
      setDevices(list);
    } catch (e) {
      setActive(false);
      setStatus("error");
      setMessage(cameraErrorMessage(e));
    }
  };

  const stop = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setTorchOn(false);
    setTorchReady(false);
    setActive(false);
    setStatus("idle");
  };

  const toggleTorch = async () => {
    const switchTorch = controlsRef.current?.switchTorch;
    if (!switchTorch) return;
    try {
      await switchTorch(!torchOn);
      setTorchOn((prev) => !prev);
    } catch {
      setTorchReady(false);
      setMessage("この端末ではライトを使えませんでした");
    }
  };

  const changeDevice = async (nextId: string) => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setDeviceId(nextId);
    await start(nextId);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-ink-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          {active ? (
            <button
              type="button"
              onClick={stop}
              className="rounded-full border border-brand-200 bg-white px-4 py-2.5 text-sm font-bold text-brand-600"
            >
              スキャンを終わる
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void start(deviceId)}
              className="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-bold text-white"
            >
              <Camera size={15} /> スキャンする
            </button>
          )}
          {active && torchReady && (
            <button
              type="button"
              onClick={() => void toggleTorch()}
              aria-pressed={torchOn}
              className={`flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-bold ${
                torchOn ? "border-amber-300 bg-amber-100 text-amber-900" : "border-ink-200 bg-white text-ink-600"
              }`}
            >
              <Flashlight size={15} /> ライト{torchOn ? "OFF" : "ON"}
            </button>
          )}
          {active && devices.length > 1 && (
            <label className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-2 text-sm text-ink-600">
              <SwitchCamera size={15} />
              <span className="sr-only">使うカメラ</span>
              <select
                value={deviceId ?? ""}
                onChange={(e) => void changeDevice(e.target.value)}
                className="max-w-[9rem] bg-transparent text-sm outline-none"
              >
                {devices.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `カメラ ${i + 1}`}
                  </option>
                ))}
              </select>
            </label>
          )}
          <form
            className="flex w-full gap-2 sm:w-auto"
            onSubmit={(e) => {
              e.preventDefault();
              if (jan) void lookup(jan, false);
            }}
          >
            <input
              value={jan}
              onChange={(e) => setJan(e.target.value)}
              placeholder="バーコードの数字を手入力"
              className="min-w-0 flex-1 rounded-full border border-brand-100 px-4 py-2.5 text-sm outline-none focus:border-brand-300 sm:w-56 sm:flex-none"
            />
            <button
              type="submit"
              className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-brand-200 bg-white px-3 py-2.5 text-sm"
            >
              <Search size={14} /> 探す
            </button>
          </form>
        </div>
        <p className="mt-2 text-xs text-ink-400">
          カメラは開いたままにできます。パッケージを次々かざすと、そのままポーチに入っていきます。
        </p>
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`mt-3 w-full rounded-2xl bg-black ${active ? "" : "hidden"}`}
        />
        {message && <p className="mt-2 text-sm text-red-600">{message}</p>}
      </div>

      {registered.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="font-bold text-emerald-900">{registered.length}点をポーチに入れました</div>
          <ul className="mt-2 space-y-1 text-sm text-emerald-900">
            {registered.map((p) => (
              <li key={p.id} className="flex items-center gap-1.5">
                <Check size={14} /> {p.brands?.name} {p.name}
              </li>
            ))}
          </ul>
          <Link
            href="/stash"
            className="mt-3 inline-block rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
          >
            Myポーチを見る
          </Link>
        </div>
      )}

      {status === "found" && hit && !registered.some((p) => p.id === hit.id) && (
        <div className="rounded-2xl border border-ink-200 bg-white p-5">
          <div className="text-xs text-ink-400">読み取ったバーコード {jan}</div>
          <div className="mt-1 font-bold">
            {hit.brands?.name} {hit.name}
          </div>
          <div className="text-sm text-ink-600">
            {CATEGORY_LABEL[hit.category]} ・ ¥{hit.price_yen.toLocaleString()}
          </div>
          <button
            type="button"
            onClick={() => void register(hit, "manual")}
            className="mt-3 rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white"
          >
            ポーチに入れる
          </button>
        </div>
      )}

      {status === "unknown" && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <div className="font-bold text-amber-900">このバーコードは登録がありません</div>
          <p className="text-sm text-amber-900">似ている商品を下から選んで登録してください。</p>
          <div className="mt-3 grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
            {candidates.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => void register(p, "manual")}
                className="flex items-center gap-2 rounded-2xl border border-ink-200 bg-white p-2 text-left text-sm"
              >
                <span
                  className="swatch inline-block h-8 w-8 rounded-full"
                  style={{ background: p.color_hex ?? "#e9e2e6" }}
                />
                <span className="min-w-0">
                  <span className="block truncate">
                    {p.brands?.name} {p.name}
                  </span>
                  <span className="text-xs text-ink-400">¥{p.price_yen.toLocaleString()}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
