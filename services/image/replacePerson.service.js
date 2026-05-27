// replacePerson.service.js  (FIXED — auto-crops black padding from product asset)

import fs from "fs";
import sharp from "sharp";

const PRODUCTS_PATH = "public/assets/bmelmnt.png";

export const replacePersonInBanner = async ({ templatePath, personBuffer }) => {
  const { width: W, height: H } = await sharp(templatePath).metadata();
  console.log(`Banner dimensions: ${W}x${H}`);

  // ── Person layer ──────────────────────────────────────────
  const personLayer = await sharp(personBuffer)
    .resize({
      height: Math.round(H * 0.55),
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const { width: personW } = await sharp(personLayer).metadata();

  // ── Product layer — remove black bg THEN trim empty space ─
  const productLayer = await removeBlackBgAndTrim(
    PRODUCTS_PATH,
    Math.round(H * 0.38),
  );

  const { width: prodW } = await sharp(productLayer).metadata();

  // ── Positions ─────────────────────────────────────────────
  const personLeft = Math.round(W * 1.05 - personW);
  const personTop = Math.round(H * 0.24);

  const productLeft = Math.round(W * 0.66 - prodW / 2);
  const productTop = Math.round(H * 0.62);

  console.log(`Person  → left=${personLeft}, top=${personTop}`);
  console.log(`Products → left=${productLeft}, top=${productTop}`);

  const finalBannerBuffer = await sharp(templatePath)
    .composite([
      { input: personLayer, left: personLeft, top: personTop, blend: "over" },
      {
        input: productLayer,
        left: productLeft,
        top: productTop,
        blend: "over",
      },
    ])
    .jpeg({ quality: 95 })

    .toBuffer();

  console.log("Composite complete");
  return finalBannerBuffer;
};

const removeBlackBgAndTrim = async (imagePath, targetHeight) => {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Asset not found: ${imagePath}`);
  }

  // Step 1 — Remove black background (pixels r<30, g<30, b<30 → transparent)
  const { data, info } = await sharp(imagePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8ClampedArray(data);

  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] < 30 && pixels[i + 1] < 30 && pixels[i + 2] < 30) {
      pixels[i + 3] = 0; // fully transparent
    }
  }

  const noBgBuffer = await sharp(Buffer.from(pixels), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  // Step 2 — Trim transparent edges + resize to target height
  const trimmedBuffer = await sharp(noBgBuffer)
    .trim() // ← auto-crop all transparent padding
    .resize({
      height: targetHeight,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const { width, height } = await sharp(trimmedBuffer).metadata();
  console.log(`Product layer after trim+resize: ${width}x${height}`);

  return trimmedBuffer;
};

//new comoment
// import fs from "fs";
// import sharp from "sharp";

// // ─────────────────────────────────────────
// // PRODUCT ASSET PATHS
// // ─────────────────────────────────────────
// const BUCKET_PATH = "public/assets/bucket_10L.png";
// const CANISTER_PATH = "public/assets/canister_5L.png";
// const BOTTLE_PATH = "public/assets/bottle_1L.png";

// /**
//  * Composites the person (bg removed) and product assets onto the
//  * already-translated template using Sharp only.
//  *
//  * NO AI is used here — the person's face is pixel-locked by Sharp.
//  * AI text replacement happens BEFORE this step in replaceTemplateText.service.js.
//  *
//  * @param {string} templatePath   - Path to the translated template image
//  * @param {Buffer} personBuffer   - PNG buffer of person with transparent background
//  * @returns {Buffer}              - Final JPEG banner buffer
//  */
// export const replacePersonInBanner = async ({
//   templatePath,
//   personBuffer,
// }) => {
//   // ─────────────────────────────────────────
//   // STEP 1 — Get banner dimensions
//   // ─────────────────────────────────────────

//   const { width: W, height: H } = await sharp(templatePath).metadata();
//   console.log(`replacePersonInBanner: Banner dimensions ${W}x${H}`);

//   // ─────────────────────────────────────────
//   // STEP 2 — Resize person
//   // Person is sized so torso lands behind the product cluster
//   // and head/shoulders sit just below the logo.
//   // Sharp owns the person — AI never touches it.
//   // ─────────────────────────────────────────

//   const personLayer = await sharp(personBuffer)
//     .resize({
//       height: Math.round(H * 0.48),
//       fit: "contain",
//       background: { r: 0, g: 0, b: 0, alpha: 0 },
//     })
//     .png()
//     .toBuffer();

//   const { width: personW, height: personH } =
//     await sharp(personLayer).metadata();
//   console.log(`Person layer size: ${personW}x${personH}`);

//   // ─────────────────────────────────────────
//   // STEP 3 — Prepare product layers
//   // Remove black background from product PNGs.
//   // Heights computed from real template height (H).
//   // ─────────────────────────────────────────

//   const [bucketLayer, canisterLayer, bottleLayer] = await Promise.all([
//     removeBlackBg(BUCKET_PATH, Math.round(H * 0.21)),
//     removeBlackBg(CANISTER_PATH, Math.round(H * 0.16)),
//     removeBlackBg(BOTTLE_PATH, Math.round(H * 0.135)),
//   ]);

//   console.log("Product layers ready");

//   // ─────────────────────────────────────────
//   // STEP 4 — Sharp composite: template → person → products
//   //
//   // Z-ORDER (bottom → top):
//   //   translated template  (background, already has correct text)
//   //   → person             (behind products)
//   //   → bucket             (hero product, in front of person)
//   //   → canister           (overlaps bucket right edge)
//   //   → bottle             (overlaps canister right edge)
//   //
//   // Person position: right-anchored to house interior edge (~95.6% width),
//   // head sits below logo, lower torso covered by product cluster.
//   // ─────────────────────────────────────────

//   const personLeft = Math.round(W * 0.956 - personW);
//   const personTop  = Math.round(H * 0.41);

//   const bucketLeft   = Math.round(W * 0.4);
//   const bucketTop    = Math.round(H * 0.73);

//   const canisterLeft = Math.round(W * 0.61);
//   const canisterTop  = Math.round(H * 0.775);

//   const bottleLeft   = Math.round(W * 0.725);
//   const bottleTop    = Math.round(H * 0.805);

//   const finalBannerBuffer = await sharp(templatePath)
//     .composite([
//       // Person — behind everything below
//       {
//         input: personLayer,
//         left: personLeft,
//         top:  personTop,
//         blend: "over",
//       },
//       // Bucket — hero, sits in front of person torso
//       {
//         input: bucketLayer,
//         left: bucketLeft,
//         top:  bucketTop,
//         blend: "over",
//       },
//       // Canister — overlaps bucket right edge
//       {
//         input: canisterLayer,
//         left: canisterLeft,
//         top:  canisterTop,
//         blend: "over",
//       },
//       // Bottle — overlaps canister right edge
//       {
//         input: bottleLayer,
//         left: bottleLeft,
//         top:  bottleTop,
//         blend: "over",
//       },
//     ])
//     .jpeg({ quality: 95 })
//     .toBuffer();

//   console.log("replacePersonInBanner: Sharp composite complete — face pixel-locked");

//   return finalBannerBuffer;
// };

// // ─────────────────────────────────────────
// // HELPER — Remove black background from product PNGs
// // Pixels with r<30, g<30, b<30 → fully transparent
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
//       pixels[i + 3] = 0; // fully transparent
//     }
//   }

//   return sharp(Buffer.from(pixels), {
//     raw: { width: info.width, height: info.height, channels: 4 },
//   })
//     .png()
//     .toBuffer();
// };
