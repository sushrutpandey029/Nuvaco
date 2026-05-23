import fs from "fs";
import path from "path";


import { removeBackgroundOpenAI } from "../openai/removeBg.service.js";
// import { transliterateTagline } from "../openai/transliterate.service.js";
//  import { replaceTemplateText } from "../image/replaceTemplateText.service.js";
import { replacePersonInBanner } from "../image/replacePerson.service.js";
import { saveImage } from "../image/saveImage.service.js";
import { createTempFile } from "../../utils/createTempFile.js";
import { enhanceBanner } from "../image/enhanceBanner.service.js";

import { LANGUAGE_TEMPLATES } from "../image/template.config.js";

// ─────────────────────────────────────────
// ALL HINDI SOURCE TEXTS IN THE BANNER
// Add / remove entries here as the template changes.
// Keys are used to match source → converted in the AI prompt.
// ─────────────────────────────────────────
// const SOURCE_TEXTS = {
//   headline: `"हर मौसम में घर की
// फुलप्रूफ सुरक्षा के लिए
// मेरा भरोसा
// NUVOCO
// ZERO M IWC+ "`,
//   bullet1: "जंग प्रूफ",
//   bullet2: "दरार प्रूफ",
//   bullet3: "लीकेज प्रूफ",
// };



// DEBUG OUTPUT DIR — remove after testing
const DEBUG_DIR = "public/debug";

export const generateBanner = async ({
  personBuffer,
  language,
  originalName,
}) => {
  console.log("=== generateBanner START ===");
  console.log("Language:", language);
  console.log("Original file:", originalName);

  const TEMPLATE_PATH =
  LANGUAGE_TEMPLATES[language?.toUpperCase()];

if (!TEMPLATE_PATH) {
  throw new Error(`Invalid language: ${language}`);
}

  // Validate template
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Template not found: ${TEMPLATE_PATH}`);
  }

  // Create debug dir if not exists
  if (!fs.existsSync(DEBUG_DIR)) {
    fs.mkdirSync(DEBUG_DIR, { recursive: true });
  }

  const ext = path.extname(originalName).toLowerCase() || ".jpg";
  console.log("Detected extension:", ext);

  const tempPath = await createTempFile(
    personBuffer,
    `person-${Date.now()}${ext}`,
  );
  console.log("Temp file created:", tempPath);

  try {
    // ─────────────────────────────
    // STEP 1 — REMOVE BACKGROUND
    // ─────────────────────────────

    console.log("STEP 1: Removing background...");

    let removedBgBuffer;

    try {
      removedBgBuffer = await removeBackgroundOpenAI(tempPath);
    } catch (bgError) {
      throw new Error(`Background removal failed: ${bgError.message}`);
    }

    // DEBUG — save remove.bg output
    const debugBgPath = path.join(DEBUG_DIR, "step1_nobg.png");
    fs.writeFileSync(debugBgPath, removedBgBuffer);
    console.log(`DEBUG: remove.bg output saved → ${debugBgPath}`);
    console.log("STEP 1 COMPLETE");

    // ─────────────────────────────
    // SHARP COMPOSITE
    // STEP 2: Compositing person + products onto language template
    // AI never touches this step — face is pixel-locked by Sharp.
    // ─────────────────────────────

    console.log(
      "STEP 2: Compositing person + products onto language template",
    );

    let finalBannerBuffer;

    try {
     finalBannerBuffer = await replacePersonInBanner({
  templatePath: TEMPLATE_PATH,
  personBuffer: removedBgBuffer,
});
    } catch (compositeError) {
      throw new Error(`Banner compositing failed: ${compositeError.message}`);
    }
    finalBannerBuffer = await enhanceBanner(finalBannerBuffer);
   
    // DEBUG — save final composite
    const debugFinalPath = path.join(DEBUG_DIR, "step4_final_banner.jpg");
    fs.writeFileSync(debugFinalPath, finalBannerBuffer);
    console.log(`DEBUG: Final banner saved → ${debugFinalPath}`);
    console.log("STEP 4 COMPLETE");

    // ─────────────────────────────
    // STEP 5 — SAVE IMAGE
    // ─────────────────────────────

    console.log("STEP 5: Saving image...");

    const savedPath = await saveImage(finalBannerBuffer);

    console.log("Saved:", savedPath);
    console.log("=== generateBanner DONE ===");

    return savedPath;
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
      console.log("Temp file deleted:", tempPath);
    }
  }
};
