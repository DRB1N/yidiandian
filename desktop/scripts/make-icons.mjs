/**
 * 由 assets/icon.svg 生成各平台要用的位图。
 *
 *   node scripts/make-icons.mjs
 *
 * 产出：
 *   assets/icon.png            1024×1024  Electron 窗口 / electron-builder（会自动转 .ico/.icns）
 *   assets/icon-512.png        512×512
 *   ../mobile/assets/icon.png     1024×1024  @capacitor/assets 的输入
 *   ../mobile/assets/splash.png   2732×2732 同上
 *   ../mobile/android/…/res/…     Android 的启动图和图标
 *
 * 最后一项是直接改 `cap add android` 生成出来的原生工程。原生工程被删掉重建之后，
 * 重新跑一次这个脚本就能把品牌资源补回去，不用手点 Android Studio。
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const desktop = path.resolve(here, "..");
const repo = path.resolve(desktop, "..");

const svg = await readFile(path.join(desktop, "assets", "icon.svg"));

const PAPER = "#f6f1e7";

/**
 * density 决定 SVG 光栅化的倍率（72 就是 1:1）。矢量图放大不会糊，所以
 * 默认给高一点；但 2732 的启动图再有 7 倍就成了 19000px 的位图，
 * 会撞上 sharp 的像素上限，所以它的 density 单独降到 96。
 */
async function png(outPath, size, src = svg, density = 512) {
  await mkdir(path.dirname(outPath), { recursive: true });
  const buf = await sharp(src, { density })
    .resize(size, size, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(outPath, buf);
  console.log(`${String(size).padStart(4)}px  ${path.relative(repo, outPath)}`);
}

await png(path.join(desktop, "assets", "icon.png"), 1024);
await png(path.join(desktop, "assets", "icon-512.png"), 512);

// 移动端：图标 + 启动图（启动图把图标居中放在纸色底上）
const splashSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732" width="2732" height="2732">
     <rect width="2732" height="2732" fill="#f6f1e7"/>
     <g transform="translate(856 856) scale(1.99)">${svg.toString().replace(/<\?xml[^>]*\?>/, "").replace(/<svg[^>]*>/, "").replace(/<\/svg>/, "")}</g>
   </svg>`
);

await png(path.join(repo, "mobile", "assets", "icon.png"), 1024);
await png(path.join(repo, "mobile", "assets", "splash.png"), 2732, splashSvg, 96);

// ── Android ───────────────────────────────────────────────────────────────
// 模板自带的启动图和图标是 Capacitor 的 logo，这里全部换成亿點點的。
const RES = path.join(repo, "mobile", "android", "app", "src", "main", "res");

/**
 * 只画路线本身，不要纸张底和网点 —— 自适应图标的前景层和启动图都只需要图形。
 * ratio 是图形占画布的比例：前景层要留出安全区，启动图可以大一些。
 * 357 是图形连描边的外框尺寸（两端的站点圆各 36 半径 + 13 描边）。
 */
function glyphSvg(size, ratio) {
  const k = ratio / 357;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
       <g transform="translate(${size / 2} ${size / 2}) scale(${k}) translate(-256 -256)">
         <rect x="128" y="238" width="286" height="72" fill="#f5db5c" opacity="0.72"/>
         <path d="M120 392 C 120 260, 392 300, 392 120" fill="none" stroke="#c4432b" stroke-width="22" stroke-linecap="round"/>
         <circle cx="120" cy="392" r="36" fill="#5e7a5c" stroke="#1b1714" stroke-width="13"/>
         <circle cx="256" cy="274" r="36" fill="#fffdf7" stroke="#1b1714" stroke-width="13"/>
         <circle cx="392" cy="120" r="36" fill="#c4432b" stroke="#1b1714" stroke-width="13"/>
       </g>
     </svg>`
  );
}

/** 圆形启动器图标：拿同样一张图裁成圆 */
async function pngRound(outPath, size) {
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
       <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/>
     </svg>`
  );
  const base = await sharp(svg, { density: 512 }).resize(size, size, { fit: "cover" }).png().toBuffer();
  const buf = await sharp(base).composite([{ input: mask, blend: "dest-in" }]).png({ compressionLevel: 9 }).toBuffer();
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, buf);
  console.log(`${String(size).padStart(4)}px  ${path.relative(repo, outPath)}`);
}

const DENSITIES = [
  ["mdpi", 1],
  ["hdpi", 1.5],
  ["xhdpi", 2],
  ["xxhdpi", 3],
  ["xxxhdpi", 4],
];

for (const [density, k] of DENSITIES) {
  const dir = path.join(RES, `mipmap-${density}`);

  // 自适应图标（API 26+）：前景层 108dp 里图形只占 64dp，边缘留给各家启动器的裁切。
  // 两个数都要按密度放大 —— 画布单位是像素，不是 dp。
  await png(path.join(dir, "ic_launcher_foreground.png"), Math.round(108 * k), glyphSvg(108 * k, 64 * k));
  // 老系统直接用的整块图标
  await png(path.join(dir, "ic_launcher.png"), Math.round(48 * k));
  await pngRound(path.join(dir, "ic_launcher_round.png"), Math.round(48 * k));
}

// 启动图：每个屏幕密度/方向各一张，尺寸沿用模板原本的，换成纸底 + 居中的路线
for (const [dirName, w, h] of [
  ["drawable", 480, 320],
  ["drawable-port-mdpi", 320, 480],
  ["drawable-port-hdpi", 480, 800],
  ["drawable-port-xhdpi", 720, 1280],
  ["drawable-port-xxhdpi", 960, 1600],
  ["drawable-port-xxxhdpi", 1280, 1920],
  ["drawable-land-mdpi", 480, 320],
  ["drawable-land-hdpi", 800, 480],
  ["drawable-land-xhdpi", 1280, 720],
  ["drawable-land-xxhdpi", 1600, 960],
  ["drawable-land-xxxhdpi", 1920, 1280],
]) {
  const glyph = Math.round(Math.min(w, h) * 0.34);
  const buf = await sharp({
    create: { width: w, height: h, channels: 4, background: PAPER },
  })
    .composite([{ input: glyphSvg(glyph, glyph), top: Math.round((h - glyph) / 2), left: Math.round((w - glyph) / 2) }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  const outPath = path.join(RES, dirName, "splash.png");
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, buf);
  console.log(`${String(w).padStart(4)}×${h}  ${path.relative(repo, outPath)}`);
}

// 图标背景层和启动主题的底色：都换成纸色
await writeFile(
  path.join(RES, "values", "ic_launcher_background.xml"),
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${PAPER}</color>
</resources>
`
);
await writeFile(
  path.join(RES, "values", "yidiandian_colors.xml"),
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- 启动主题的底色，和网页的纸张底色一致，从启动图进界面不会有跳色 -->
    <color name="paper">${PAPER}</color>
</resources>
`
);

// 启动主题原本指向模板那张 Capacitor 启动图，改指到底色
const stylesPath = path.join(RES, "values", "styles.xml");
const styles = await readFile(stylesPath, "utf8");
if (styles.includes("@drawable/splash")) {
  await writeFile(stylesPath, styles.replace(/@drawable\/splash/g, "@color/paper"));
  console.log(`   ——   ${path.relative(repo, stylesPath)} 启动底色改为纸色`);
}

console.log("图标好了。");
