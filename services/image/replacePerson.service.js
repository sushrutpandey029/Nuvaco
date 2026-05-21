import fs from "fs";
import sharp from "sharp";
import OpenAI, { toFile } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────
// PRODUCT ASSET PATHS
// ─────────────────────────────────────────
const BUCKET_PATH = "public/assets/bucket_10L.png";
const CANISTER_PATH = "public/assets/canister_5L.png";
const BOTTLE_PATH = "public/assets/bottle_1L.png";

export const replacePersonInBanner = async ({
  templatePath,
  personBuffer,
  tagline,
}) => {
  // ─────────────────────────────────────────
  // STEP 1 — Get banner dimensions
  // ─────────────────────────────────────────

  const { width: W, height: H } = await sharp(templatePath).metadata();
  console.log(`Banner: ${W}x${H}`);

  // ─────────────────────────────────────────
  // STEP 2 — Resize person
  // Sharp owns the person — AI never touches it.
  // Person is sized so his torso lands behind the product cluster
  // and his head/shoulders sit just below the logo.
  // ─────────────────────────────────────────

  const personLayer = await sharp(personBuffer)
    .resize({
      height: Math.round(H * 0.48), // ~48% of banner height
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const { width: personW, height: personH } =
    await sharp(personLayer).metadata();
  console.log(`Person layer size: ${personW}x${personH}`);

  // ─────────────────────────────────────────
  // STEP 3 — Prepare product layers
  // Remove black background from product PNGs.
  // Heights recomputed from the REAL template height (H).
  // Bucket is the hero — largest. Canister mid. Bottle smallest.
  // ─────────────────────────────────────────

  const [bucketLayer, canisterLayer, bottleLayer] = await Promise.all([
    removeBlackBg(BUCKET_PATH, Math.round(H * 0.21)),
    removeBlackBg(CANISTER_PATH, Math.round(H * 0.16)),
    removeBlackBg(BOTTLE_PATH, Math.round(H * 0.135)),
  ]);

  console.log("Product layers ready");

  // ─────────────────────────────────────────
  // STEP 4 — Sharp composites EVERYTHING
  // Z-ORDER (bottom → top): background → PERSON → products
  // Because products are composited AFTER the person, they render
  // IN FRONT of him — i.e. the person stands BEHIND the products.
  // Person face is pixel-locked here; AI never changes it.
  // ─────────────────────────────────────────

  // Person: RIGHT-ANCHORED to the house INTERIOR edge (~95.6% of width), NOT
  // the banner edge — keeps the side margin seen in the reference. Lowered so
  // his head sits clear below the logo (matching the target) and his lower
  // torso is covered by the product cluster.
  const personLeft = Math.round(W * 0.956 - personW);
  const personTop = Math.round(H * 0.41);

  // Product cluster anchored bottom, sitting UNDER the person (shifted right).
  // Bucket is the visual anchor; canister + bottle step down to the right.
  const bucketLeft = Math.round(W * 0.4);
  const bucketTop = Math.round(H * 0.73);

  const canisterLeft = Math.round(W * 0.61);
  const canisterTop = Math.round(H * 0.775);

  const bottleLeft = Math.round(W * 0.725);
  const bottleTop = Math.round(H * 0.805);

  const finalComposite = await sharp(templatePath)
    .composite([
      // Person — BEHIND everything below
      {
        input: personLayer,
        left: personLeft,
        top: personTop,
        blend: "over",
      },
      // Bucket — hero, sits in front of person's torso
      {
        input: bucketLayer,
        left: bucketLeft,
        top: bucketTop,
        blend: "over",
      },
      // Canister — overlaps bucket's right edge
      {
        input: canisterLayer,
        left: canisterLeft,
        top: canisterTop,
        blend: "over",
      },
      // Bottle — overlaps canister's right edge
      {
        input: bottleLayer,
        left: bottleLeft,
        top: bottleTop,
        blend: "over",
      },
    ])
    .jpeg({ quality: 95 })
    .toBuffer();

  console.log("Sharp composite complete — person behind products, face locked");

  // ─────────────────────────────────────────
  // STEP 5 — Text replacement (non-Hindi only)
  // AI only sees the finished banner — never the person separately.
  // Skipped entirely for Hindi (template text already correct).
  // ─────────────────────────────────────────

  const SOURCE_TAGLINE = "हर मौसम में घर की फुलप्रूफ सुरक्षा के लिए";

  if (!tagline || tagline.trim() === SOURCE_TAGLINE) {
    console.log("Hindi language — skipping AI text step");
    return finalComposite;
  }

  console.log("Non-Hindi — running AI text replacement only...");

  const bannerFile = await toFile(finalComposite, "banner.jpeg", {
    type: "image/jpeg",
  });

  const textResult = await openai.images.edit({
    model: "gpt-image-1",
    image: [bannerFile], // ← ONLY the finished Sharp composite
    prompt: `
You are doing ONE task only: replace a text string in this banner image.

Find this exact Hindi text near the top of the banner:
"हर मौसम में घर की फुलप्रूफ सुरक्षा के लिए"

Replace it with:
"${tagline}"

STRICT RULES — keep everything identical:
- Same position on banner
- Same font size
- Same font weight (bold)
- Same white color
- Same center alignment
- Same line breaks
- Same letter spacing

Upload Image - Key Original Image

 - keep original Image of dealer

DO NOT change anything else:
- Do NOT move, resize, or alter the person
- Do NOT touch any product, bucket, bottle, or canister
- Do NOT change any logo, icon, or branding
- Do NOT change the background
- Do NOT change any other text
- Do NOT redesign or regenerate anything

Only the headline text characters change. Everything else stays pixel-identical.
    `,
    size: "1024x1536",
  });

  const textBuffer = Buffer.from(textResult.data[0].b64_json, "base64");
  console.log("AI text replacement complete");

  return textBuffer;
};

// ─────────────────────────────────────────
// HELPER — Remove black background from product PNGs
// Pixels with r<30, g<30, b<30 → transparent
// ─────────────────────────────────────────

const removeBlackBg = async (imagePath, targetHeight) => {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Product asset not found: ${imagePath}`);
  }

  const { data, info } = await sharp(imagePath)
    .resize({ height: targetHeight, fit: "contain" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8ClampedArray(data);

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    if (r < 30 && g < 30 && b < 30) {
      pixels[i + 3] = 0; // fully transparent
    }
  }

  return sharp(Buffer.from(pixels), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
};

//one new

// import fs from "fs";
// import sharp from "sharp";
// import OpenAI, { toFile } from "openai";

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// // ─────────────────────────────────────────
// // PRODUCT ASSET PATHS
// // ─────────────────────────────────────────
// const BUCKET_PATH   = "public/assets/bucket_10L.png";
// const CANISTER_PATH = "public/assets/canister_5L.png";
// const BOTTLE_PATH   = "public/assets/bottle_1L.png";

// export const replacePersonInBanner = async ({
//   templatePath,
//   personBuffer,
//   tagline,
// }) => {

//   // ─────────────────────────────────────────
//   // STEP 1 — Get banner dimensions
//   // ─────────────────────────────────────────

//   const { width: W, height: H } = await sharp(templatePath).metadata();
//   console.log(`Banner: ${W}x${H}`);

//   // ─────────────────────────────────────────
//   // STEP 2 — Resize person
//   // Sharp owns the person 100% — AI never sees it
//   // ─────────────────────────────────────────

//   const personLayer = await sharp(personBuffer)
//     .resize({
//       height: Math.round(H * 0.55),
//       fit: "contain",
//       background: { r: 0, g: 0, b: 0, alpha: 0 },
//     })
//     .png()
//     .toBuffer();

//   const { width: personW, height: personH } = await sharp(personLayer).metadata();
//   console.log(`Person layer: ${personW}x${personH}`);

//   // ─────────────────────────────────────────
//   // STEP 3 — Prepare product layers
//   // ─────────────────────────────────────────

//   const [bucketLayer, canisterLayer, bottleLayer] = await Promise.all([
//     removeBlackBg(BUCKET_PATH,   Math.round(H * 0.240)),
//     removeBlackBg(CANISTER_PATH, Math.round(H * 0.190)),
//     removeBlackBg(BOTTLE_PATH,   Math.round(H * 0.150)),
//   ]);

//   // Get actual rendered widths for dynamic positioning (no hardcoded gap)
//   const { width: bucketW }   = await sharp(bucketLayer).metadata();
//   const { width: canisterW } = await sharp(canisterLayer).metadata();

//   console.log(`Bucket: ${bucketW}px wide | Canister: ${canisterW}px wide`);

//   // ─────────────────────────────────────────
//   // STEP 4 — Calculate positions dynamically
//   // Canister and bottle auto-placed next to bucket — no gap
//   // ─────────────────────────────────────────

//   // Person — right side
//   const personLeft = Math.round(W * 0.956 - personW);
//   const personTop  = Math.round(H * 0.41);

//   // Bucket — anchor
//   const bucketLeft = Math.round(W * 0.40);
//   const bucketTop  = Math.round(H * 0.73);

//   // Canister — right after bucket, 60px overlap to close gap
//   const canisterLeft = bucketLeft + bucketW - 60;
//   const canisterTop  = Math.round(H * 0.775);

//   // Bottle — right after canister, 40px overlap
//   const bottleLeft = canisterLeft + canisterW - 40;
//   const bottleTop  = Math.round(H * 0.805);

//   console.log(`Person:   ${personLeft},${personTop}`);
//   console.log(`Bucket:   ${bucketLeft},${bucketTop}`);
//   console.log(`Canister: ${canisterLeft},${canisterTop}`);
//   console.log(`Bottle:   ${bottleLeft},${bottleTop}`);

//   // ─────────────────────────────────────────
//   // STEP 5 — Sharp composites EVERYTHING
//   // Order: background → person → bucket → canister → bottle
//   // ─────────────────────────────────────────

//   const finalComposite = await sharp(templatePath)
//     .composite([
//       { input: personLayer,   left: personLeft,   top: personTop,   blend: "over" },
//       { input: bucketLayer,   left: bucketLeft,   top: bucketTop,   blend: "over" },
//       { input: canisterLayer, left: canisterLeft, top: canisterTop, blend: "over" },
//       { input: bottleLayer,   left: bottleLeft,   top: bottleTop,   blend: "over" },
//     ])
//     .jpeg({ quality: 95 })
//     .toBuffer();

//   console.log("Sharp composite complete — face locked, no gap between products");

//   // ─────────────────────────────────────────
//   // STEP 6 — AI text transliteration ONLY
//   // Hindi → return Sharp output directly (zero AI calls)
//   // Non-Hindi → AI replaces ONLY text, nothing else
//   // ─────────────────────────────────────────

//   const SOURCE_TAGLINE = "हर मौसम में घर की फुलप्रूफ सुरक्षा के लिए";
//   const isHindi = !tagline ||
//                   tagline.trim() === SOURCE_TAGLINE ||
//                   /[\u0900-\u097F]/.test(tagline);

//   if (isHindi) {
//     console.log("Hindi — skipping AI, returning Sharp output directly");
//     return finalComposite;
//   }

//   console.log(`Non-Hindi — running AI text replacement for: "${tagline}"`);

//   const bannerFile = await toFile(finalComposite, "banner.jpeg", {
//     type: "image/jpeg",
//   });

//   const textResult = await openai.images.edit({
//     model: "gpt-image-1",
//     image: [bannerFile],
//     prompt: `
// You are doing ONE job only: replace TEXT in this banner image. Nothing else.

// REPLACE THIS HINDI HEADLINE (top of banner):
// "हर मौसम में घर की फुलप्रूफ सुरक्षा के लिए"
// → Replace with: "${tagline}"

// REPLACE THESE 3 FEATURE LABELS (left side of banner):
// "जंग प्रूफ"   → translate to same language as "${tagline}"
// "दरार प्रूफ"  → translate to same language as "${tagline}"
// "लीकेज प्रूफ" → translate to same language as "${tagline}"

// WHAT MUST STAY 100% IDENTICAL — DO NOT TOUCH:
// - The person (face, body, clothing, size, position — pixel identical)
// - The bucket, canister, bottle (labels, size, position — pixel identical)
// - The circular icons next to feature labels (do NOT modify icons)
// - NUVOCO logo, ZERO M, IWC+, मेरा भरोसा badge
// - Background, house shape, blue color, white pedestal
// - Font size, font weight, text color, text alignment

// ONLY the text string characters change. Every pixel except text is identical.
//     `,
//     size: "1024x1536",
//   });

//   const textBuffer = Buffer.from(textResult.data[0].b64_json, "base64");
//   console.log("AI text replacement complete");

//   return textBuffer;
// };

// // ─────────────────────────────────────────
// // HELPER — Remove black background from product PNGs
// // ─────────────────────────────────────────

// const removeBlackBg = async (imagePath, targetHeight) => {
//   if (!fs.existsSync(imagePath)) {
//     throw new Error(`Product asset not found: ${imagePath}`);
//   }

//   const { data, info } = await sharp(imagePath)
//     .resize({ height: targetHeight, fit: "contain" })
//     .ensureAlpha()
//     .raw()
//     .toBuffer({ resolveWithObject: true });

//   const pixels = new Uint8ClampedArray(data);

//   for (let i = 0; i < pixels.length; i += 4) {
//     const r = pixels[i];
//     const g = pixels[i + 1];
//     const b = pixels[i + 2];
//     if (r < 30 && g < 30 && b < 30) {
//       pixels[i + 3] = 0;
//     }
//   }

//   return sharp(Buffer.from(pixels), {
//     raw: { width: info.width, height: info.height, channels: 4 },
//   })
//     .png()
//     .toBuffer();
// };

 