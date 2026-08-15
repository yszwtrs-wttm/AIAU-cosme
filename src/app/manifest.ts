import type { MetadataRoute } from "next";

/** 店頭でホーム画面から片手で開く前提なので、standalone のアプリとして起動できるようにする。 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KAWANAI — そのコスメ、もう持ってるかも",
    short_name: "KAWANAI",
    description:
      "手持ちコスメと買おうとしている商品を照らし合わせて、「買わなくていい」を教えてくれるアプリ。",
    lang: "ja",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fdfcfc",
    theme_color: "#d92668",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "商品を探す", url: "/search" },
      { name: "手持ち登録", url: "/scan" },
      { name: "Myポーチ", url: "/stash" },
    ],
  };
}
