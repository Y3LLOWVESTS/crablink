import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

function pngMetadata(filePath) {
  const data = fs.readFileSync(filePath);

  const signature = Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
  ]);

  if (!data.subarray(0, 8).equals(signature)) {
    throw new Error(`Not a PNG file: ${filePath}`);
  }

  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
    bitDepth: data.readUInt8(24),
    colorType: data.readUInt8(25),
  };
}

function expectPng(
  filePath,
  width,
  height,
  options = {},
) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing brand asset: ${filePath}`);
  }

  const metadata = pngMetadata(filePath);

  if (
    metadata.width !== width ||
    metadata.height !== height
  ) {
    throw new Error(
      `${filePath} must be ${width}x${height}; ` +
      `received ${metadata.width}x${metadata.height}.`,
    );
  }

  if (
    options.colorType !== undefined &&
    metadata.colorType !== options.colorType
  ) {
    throw new Error(
      `${filePath} must use PNG color type ` +
      `${options.colorType}; received ${metadata.colorType}.`,
    );
  }

  if (
    options.bitDepth !== undefined &&
    metadata.bitDepth !== options.bitDepth
  ) {
    throw new Error(
      `${filePath} must use bit depth ` +
      `${options.bitDepth}; received ${metadata.bitDepth}.`,
    );
  }

  const colorDescription =
    metadata.colorType === 6
      ? "RGBA"
      : metadata.colorType === 2
        ? "RGB"
        : `color-type-${metadata.colorType}`;

  console.log(
    `GREEN: ${path.relative(root, filePath)} ` +
    `${width}x${height} ${colorDescription}`,
  );
}

const tvApp = path.join(
  root,
  "apps",
  "crablink-tv",
);

expectPng(
  path.join(
    tvApp,
    "src-tauri",
    "icons",
    "icon.png",
  ),
  512,
  512,
  {
    bitDepth: 8,
    colorType: 6,
  },
);

const androidRes = path.join(
  tvApp,
  "src-tauri",
  "gen",
  "android",
  "app",
  "src",
  "main",
  "res",
);

const densities = [
  ["mipmap-mdpi", 48, 108],
  ["mipmap-hdpi", 72, 162],
  ["mipmap-xhdpi", 96, 216],
  ["mipmap-xxhdpi", 144, 324],
  ["mipmap-xxxhdpi", 192, 432],
];

for (
  const [
    directory,
    launcherSize,
    foregroundSize,
  ] of densities
) {
  expectPng(
    path.join(
      androidRes,
      directory,
      "ic_launcher.png",
    ),
    launcherSize,
    launcherSize,
  );

  expectPng(
    path.join(
      androidRes,
      directory,
      "ic_launcher_round.png",
    ),
    launcherSize,
    launcherSize,
  );

  expectPng(
    path.join(
      androidRes,
      directory,
      "ic_launcher_foreground.png",
    ),
    foregroundSize,
    foregroundSize,
  );
}

expectPng(
  path.join(
    androidRes,
    "drawable-xhdpi",
    "tv_banner.png",
  ),
  320,
  180,
);

console.log("CrabLink TV brand-asset boundary passed.");
console.log("Tauri application icon: 512x512 RGBA.");
console.log("Android launcher densities: installed.");
console.log("Android TV banner: installed.");
