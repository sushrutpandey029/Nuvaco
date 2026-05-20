import fs from "fs";
import sharp from "sharp";
import OpenAI, { toFile } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────
// PRODUCT ASSET PATHS
// ─────────────────────────────────────────
const BUCKET_PATH   = "public/assets/bucket_10L.png";
const CANISTER_PATH = "public/assets/canister_5L.png";
const BOTTLE_PATH   = "public/assets/bottle_1L.png";

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
  // Sharp owns the person — AI never touches it
  // ─────────────────────────────────────────

  const personLayer = await sharp(personBuffer)
    .resize({
      height: Math.round(H * 0.54),
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const { width: personW } = await sharp(personLayer).metadata();
  console.log(`Person layer size: ${personW}x${Math.round(H * 0.54)}`);

  // ─────────────────────────────────────────
  // STEP 3 — Prepare product layers
  // Remove black background from product PNGs
  // ─────────────────────────────────────────

  const [bucketLayer, canisterLayer, bottleLayer] = await Promise.all([
    removeBlackBg(BUCKET_PATH,   Math.round(H * 0.28)),
    removeBlackBg(CANISTER_PATH, Math.round(H * 0.22)),
    removeBlackBg(BOTTLE_PATH,   Math.round(H * 0.17)),
  ]);

  console.log("Product layers ready");

  // ─────────────────────────────────────────
  // STEP 4 — Sharp composites EVERYTHING
  // Order: background → person → products
  // Person face is pixel-locked here, AI never changes it
  // ─────────────────────────────────────────

  const finalComposite = await sharp(templatePath)
    .composite([
      // Layer 2 — person (behind all products)
      {
        input: personLayer,
        left:  Math.round(W * 0.50),
        top:   Math.round(H * 0.38),
        blend: "over",
      },
      // Layer 3a — bucket (in front of person)
      {
        input: bucketLayer,
        left:  Math.round(W * 0.35),
        top:   Math.round(H * 0.72),
        blend: "over",
      },
      // Layer 3b — canister
      {
        input: canisterLayer,
        left:  Math.round(W * 0.67),
        top:   Math.round(H * 0.76),
        blend: "over",
      },
      // Layer 3c — small bottle (frontmost)
      {
        input: bottleLayer,
        left:  Math.round(W * 0.82),
        top:   Math.round(H * 0.80),
        blend: "over",
      },
    ])
    .jpeg({ quality: 95 })
    .toBuffer();

  console.log("Sharp composite complete — person face locked");

  // ─────────────────────────────────────────
  // STEP 5 — Text replacement (non-Hindi only)
  // AI only sees finished banner — never sees person separately
  // Skipped entirely for Hindi (template text already correct)
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
    image: [bannerFile],           // ← ONLY the finished Sharp composite
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



// import fs from "fs";
// import OpenAI, { toFile } from "openai";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// export const replacePersonInBanner = async ({
//   templatePath,
//   personBuffer,
//   tagline,
// }) => {
//   // template banner
//   const templateBuffer = fs.readFileSync(templatePath);

//   const templateFile = await toFile(templateBuffer, "template.jpeg", {
//     type: "image/jpeg",
//   });

//   // transparent person png
//   const personFile = await toFile(personBuffer, "person.png", {
//     type: "image/png",
//   });

//   // AI EDIT
//   const result = await openai.images.edit({
//     model: "gpt-image-1",

//     image: [templateFile, personFile],

//     prompt: `
// You are editing an EXISTING branded advertisement banner.

// Your task is EXTREMELY LIMITED.

// ONLY modify these TWO things:

// 1. Replace the existing person in the banner
//    with the uploaded person image.

// 2. Replace ONLY the top Hindi headline text:

// "हर मौसम में घर की फुलप्रूफ सुरक्षा के लिए"

// with this exact text:

// "${tagline}"

// STRICT RULES:

// - Do NOT redesign the banner
// - Do NOT regenerate the background
// - Do NOT change product packaging
// - Do NOT modify bucket design
// - Do NOT modify bottle design
// - Do NOT modify labels
// - Do NOT modify logos
// - Do NOT modify icons
// - Do NOT modify house shape
// - Do NOT modify colors
// - Do NOT modify lighting
// - Do NOT modify composition
// - Do NOT modify branding
// - Do NOT modify layout
// - Do NOT modify shadows
// - Do NOT modify perspective
// - Do NOT modify product text
// - Do NOT modify lower graphics
// - Do NOT modify watermark/logo areas

// The following areas must remain visually identical:
// - product bucket
// - product bottles
// - NUVOCO logo
// - ZERO M branding
// - IWC+ branding
// - left-side waterproof icons
// - blue house background

// TEXT REPLACEMENT RULES:

// - Keep EXACT same headline position
// - Keep EXACT same text alignment
// - Keep EXACT same font style
// - Keep EXACT same font weight
// - Keep EXACT same font size
// - Keep EXACT same spacing
// - Keep EXACT same line breaks
// - Keep EXACT same white color
// - Keep EXACT same professional typography style

// PERSON REPLACEMENT RULES:

// - Replace ONLY the original man
// - Preserve same pose orientation
// - Preserve same placement
// - Preserve same scale
// - Preserve same body angle
// - Blend naturally into banner
// - Keep realistic lighting
// - Keep professional advertising quality

// IMPORTANT:

// This is NOT a new design generation task.

// This is a MINIMAL EDITING task.

// Only replace:
// - existing person
// - existing headline text

// Everything else must remain unchanged and visually identical to the original banner.
// `,

//     size: "1024x1536",
//   });

//   const image_base64 = result.data[0].b64_json;

//   return Buffer.from(image_base64, "base64");
// };
