export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/**
 * ImageResponse には日本語フォントが入っていないので、必要な文字だけ Google Fonts から取る。
 * woff2 は satori が読めないため、古い User-Agent を送って truetype を返させる。
 */
export async function loadJpFont(text: string, weight: 400 | 700 = 700): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@${weight}&text=${encodeURIComponent(text)}`;
    const css = await fetch(cssUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64)" },
    }).then((res) => res.text());
    const fontUrl = css.match(/src:\s*url\((https:[^)]+)\)/)?.[1];
    if (!fontUrl) return null;

    const font = await fetch(fontUrl);
    if (!font.ok) return null;
    return await font.arrayBuffer();
  } catch {
    // フォントが取れなくてもレイアウトは出したいので、既定フォントに任せる。
    return null;
  }
}
