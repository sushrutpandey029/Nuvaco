import sharp from "sharp";

export const placePersonOnBanner = async ({ templatePath, personBuffer }) => {

  const templateMeta = await sharp(templatePath).metadata();
  const TW = templateMeta.width;   // 3456
  const TH = templateMeta.height;  // 5184

  console.log(`Template: ${TW}x${TH}`);

  // ── PERSON SIZING ─────────────────────────────────────────────────────────
  // In the sample: person occupies roughly the RIGHT HALF and is ~52% of banner height
  // Reduced from 0.63 → 0.52 so they don't overflow into the logo/text area
  const targetPersonHeight = Math.round(TH * 0.52);

  const resizedPerson = await sharp(personBuffer)
    .resize({ height: targetPersonHeight, fit: "inside" })
    .png()
    .toBuffer();

  const personMeta = await sharp(resizedPerson).metadata();
  const personW    = personMeta.width;
  const personH    = personMeta.height;

  // ── PERSON POSITION ───────────────────────────────────────────────────────
  // Right-aligned with small margin
  // Bottom of person anchored at ~95% of banner height (feet near product level)
  const rightMargin     = Math.round(TW * 0.01);
  const personLeft      = TW - personW - rightMargin;
  const personBottomPct = 0.95;                          // was 0.86 — too high
  const personTop       = Math.round(TH * personBottomPct) - personH;

  console.log(`Person: ${personW}x${personH} at top=${personTop} left=${personLeft}`);

  // ── PRODUCT FOREGROUND CROP ───────────────────────────────────────────────
  // Crop the bottom section of the ORIGINAL template (products + base)
  // and re-paste it on TOP of the person so person appears BEHIND products.
  //
  // In your template the bucket + bottles sit from ~76% down on the right half.
  // Crop starts a bit higher (73%) to make sure the bucket rim is fully covered.
  const prodTop  = Math.round(TH * 0.73);   // was 0.76 — start a bit higher
  const prodLeft = Math.round(TW * 0.10);   // was 0.12 — slightly wider crop
  const prodW    = TW - prodLeft;
  const prodH    = TH - prodTop;

  const productCrop = await sharp(templatePath)
    .extract({ left: prodLeft, top: prodTop, width: prodW, height: prodH })
    .png()
    .toBuffer();

  console.log(`Product crop: ${prodW}x${prodH} at top=${prodTop} left=${prodLeft}`);

  // ── COMPOSITE ─────────────────────────────────────────────────────────────
  // Layer order (bottom → top):
  //   1. Original template (background + all elements)
  //   2. Person (placed right side, lower)
  //   3. Product crop from template (IN FRONT of person)
  const result = await sharp(templatePath)
    .composite([
      {
        input: resizedPerson,
        top:   personTop,
        left:  personLeft,
        blend: "over",
      },
      {
        input: productCrop,
        top:   prodTop,
        left:  prodLeft,
        blend: "over",
      },
    ])
    .png()
    .toBuffer();

  console.log("Composited: person behind products");
  return result;
};