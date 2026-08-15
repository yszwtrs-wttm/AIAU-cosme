"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

/**
 * カメラを開いたまま連続でバーコードを読む。
 * 同じコードを連打で拾わないよう、1 件処理したら少し受け付けを止める。
 */
export function useBarcodeReader(
  onCode: (code: string) => void | Promise<void>,
  { cooldownMs = 1500 }: { cooldownMs?: number } = {},
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const busyRef = useRef(false);
  const handlerRef = useRef(onCode);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  handlerRef.current = onCode;

  useEffect(() => () => controlsRef.current?.stop(), []);

  const start = async () => {
    setError("");
    setScanning(true);
    try {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
      ]);
      const reader = new BrowserMultiFormatReader(hints);
      controlsRef.current = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
        if (!result || busyRef.current) return;
        busyRef.current = true;
        void Promise.resolve(handlerRef.current(result.getText())).finally(() => {
          setTimeout(() => {
            busyRef.current = false;
          }, cooldownMs);
        });
      });
    } catch (e) {
      setScanning(false);
      setError(e instanceof Error ? `カメラを開けませんでした: ${e.message}` : "カメラを開けませんでした");
    }
  };

  const stop = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  };

  return { videoRef, scanning, error, setError, start, stop };
}
