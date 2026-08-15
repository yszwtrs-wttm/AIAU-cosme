/**
 * 写真の使い回し検出に使う average hash（64bit を 16 進 16 文字で表す）。
 * ブラウザ側で計算して保存し、判定は Postgres 側の既存ロジックに任せる。
 */
export async function averageHash(file: Blob): Promise<string | null> {
  if (typeof document === "undefined") return null;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 8;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(bitmap, 0, 0, 8, 8);
  bitmap.close();

  const { data } = ctx.getImageData(0, 0, 8, 8);
  const gray: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }

  const mean = gray.reduce((a, b) => a + b, 0) / gray.length;
  let hex = "";
  for (let i = 0; i < 64; i += 4) {
    let nibble = 0;
    for (let j = 0; j < 4; j += 1) {
      nibble = (nibble << 1) | (gray[i + j] > mean ? 1 : 0);
    }
    hex += nibble.toString(16);
  }
  return hex;
}
