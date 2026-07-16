import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(
  new URL("..", import.meta.url).pathname,
);

const androidMain = path.join(
  root,
  "apps",
  "crablink-tv",
  "src-tauri",
  "gen",
  "android",
  "app",
  "src",
  "main",
);

const manifestPath = path.join(
  androidMain,
  "AndroidManifest.xml",
);

const bannerPath = path.join(
  androidMain,
  "res",
  "drawable-xhdpi",
  "tv_banner.png",
);

const manifest = fs.readFileSync(
  manifestPath,
  "utf8",
);

const requiredManifestFragments = [
  'android:name="android.permission.INTERNET"',
  'android:name="android.software.leanback"',
  'android:required="true"',
  'android:name="android.hardware.touchscreen"',
  'android:required="false"',
  'android:banner="@drawable/tv_banner"',
  'android:name="android.intent.category.LAUNCHER"',
  'android:name="android.intent.category.LEANBACK_LAUNCHER"',
  'android:screenOrientation="landscape"',
];

for (const fragment of requiredManifestFragments) {
  if (!manifest.includes(fragment)) {
    throw new Error(
      `Android TV manifest boundary is missing: ${fragment}`,
    );
  }
}

const permissions = [
  ...manifest.matchAll(
    /<uses-permission\s+android:name="([^"]+)"/g,
  ),
].map((match) => match[1]);

if (
  permissions.length !== 1 ||
  permissions[0] !== "android.permission.INTERNET"
) {
  throw new Error(
    `Unexpected Android permissions: ${permissions.join(", ")}`,
  );
}

const forbiddenManifestFragments = [
  "android.permission.CAMERA",
  "android.permission.RECORD_AUDIO",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.READ_CONTACTS",
  "android.permission.WRITE_CONTACTS",
  "android.permission.READ_PHONE_STATE",
  "android.permission.MANAGE_EXTERNAL_STORAGE",
];

for (const fragment of forbiddenManifestFragments) {
  if (manifest.includes(fragment)) {
    throw new Error(
      `Forbidden Android authority exists: ${fragment}`,
    );
  }
}

const banner = fs.readFileSync(bannerPath);

const expectedSignature = Buffer.from([
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a,
]);

if (!banner.subarray(0, 8).equals(expectedSignature)) {
  throw new Error("TV banner is not a valid PNG file.");
}

const width = banner.readUInt32BE(16);
const height = banner.readUInt32BE(20);

if (width !== 320 || height !== 180) {
  throw new Error(
    `TV banner must be 320x180, received ${width}x${height}.`,
  );
}

console.log("CrabLink TV Android boundary check passed.");
console.log(`Manifest: ${manifestPath}`);
console.log(`Banner: ${bannerPath}`);
console.log(`Banner dimensions: ${width}x${height}`);
console.log(`Permissions: ${permissions.join(", ")}`);
console.log("Leanback launcher: required.");
console.log("Touchscreen: not required.");
console.log("Orientation: landscape.");
