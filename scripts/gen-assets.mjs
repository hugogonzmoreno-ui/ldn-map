// One-off generator for the app's icon/splash/favicon marks. Re-run with
// `node scripts/gen-assets.mjs` after editing COLOUR/sizes below to regenerate.
//
// Draws a simple original "pin ring" mark (navy square, white ring, navy
// centre) — not the TfL roundel, which is trademarked.
import Jimp from 'jimp-compact';

const NAVY = 0x0057a8ff;
const WHITE = 0xffffffff;
const TRANSPARENT = 0x00000000;

function fillCircle(image, cx, cy, r, color) {
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy <= r * r) {
      this.bitmap.data.writeUInt32BE(color, idx);
    }
  });
}

function ringMark(size, { background, ringScale = 0.34, holeScale = 0.16 } = {}) {
  const image = new Jimp(size, size, background);
  const cx = size / 2;
  const cy = size / 2;
  fillCircle(image, cx, cy, size * ringScale, WHITE);
  fillCircle(image, cx, cy, size * holeScale, background === TRANSPARENT ? NAVY : background);
  return image;
}

async function main() {
  const outDir = new URL('../assets/', import.meta.url);

  // App icon: full-bleed navy background, ring mark.
  const icon = ringMark(1024, { background: NAVY });
  await icon.writeAsync(new URL('icon.png', outDir).pathname);

  // Android adaptive icon foreground: transparent background, mark inset
  // well within the ~66% safe zone Android keeps after masking.
  const adaptive = ringMark(1024, { background: TRANSPARENT, ringScale: 0.24, holeScale: 0.11 });
  await adaptive.writeAsync(new URL('adaptive-icon.png', outDir).pathname);

  // Splash: transparent background: mark centered, backgroundColor comes
  // from app.json's splash.backgroundColor via "contain" resize mode.
  const splash = ringMark(1024, { background: TRANSPARENT, ringScale: 0.22, holeScale: 0.1 });
  await splash.writeAsync(new URL('splash.png', outDir).pathname);

  // Favicon: small, solid navy background so it reads at tab size.
  const favicon = ringMark(48, { background: NAVY, ringScale: 0.36, holeScale: 0.17 });
  await favicon.writeAsync(new URL('favicon.png', outDir).pathname);

  console.log('Generated icon.png, adaptive-icon.png, splash.png, favicon.png in assets/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
