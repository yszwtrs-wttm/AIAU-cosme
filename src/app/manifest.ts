import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KAWANAI — 本当に合うコスメを探す",
    short_name: "KAWANAI",
    description: "成分・色・口コミの数値から、その商品が自分に合うかを確かめられるアプリ。",
    lang: "ja",
    start_url: "/",
    display: "standalone",
    background_color: "#fff1f6",
    theme_color: "#d92668",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
