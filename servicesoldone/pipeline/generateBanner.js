import fs from "fs";
import path from "path";

import { removeBackgroundOpenAI } from "../openai/removeBg.service.js";
import { transliterateTagline } from "../openai/transliterate.service.js";
// import { replaceTemplateText } from "c:/Users/Vivek Kumar Pandit/Downloads/files (1)/replaceTemplateText.service.js";
import { replaceTemplateText } from "../image/replaceTemplateText.service.js";
import { replacePersonInBanner } from "../image/replacePerson.service.js";
import { saveImage } from "../image/saveImage.service.js";
import { createTempFile } from "../../utils/createTempFile.js";

// ─────────────────────────────────────────
// ALL HINDI SOURCE TEXTS IN THE BANNER
// Add / remove entries here as the template changes.
// Keys are used to match source → converted in the AI prompt.
// ─────────────────────────────────────────
const SOURCE_TEXTS = {
  headline: "हर मौसम में घर की फुलप्रूफ सुरक्षा के लिए",
  brandName: "मेरा भरोसा",
  bullet1: "जंग प्रूफ",
  bullet2: "दरार प्रूफ",
  bullet3: "लीकेज प्रूफ",
};

// TEMPLATE PATH
const TEMPLATE_PATH = "public/templates/templatebg.jpeg";

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
    // STEP 2 — TRANSLITERATE ALL TEXTS
    // ─────────────────────────────

    console.log("STEP 2: Transliterating all banner texts...");

    let convertedTexts = { ...SOURCE_TEXTS }; // default — Hindi, no change needed

    if (language?.toUpperCase() !== "HINDI") {
      try {
        // Transliterate all strings in parallel
        const entries = await Promise.all(
          Object.entries(SOURCE_TEXTS).map(async ([key, text]) => {
            const converted = await transliterateTagline({ text, language });
            console.log(`  [${key}] "${text}" → "${converted}"`);
            return [key, converted];
          }),
        );
        convertedTexts = Object.fromEntries(entries);
      } catch (textError) {
        console.warn(
          `Transliteration failed, falling back to Hindi: ${textError.message}`,
        );
        convertedTexts = { ...SOURCE_TEXTS };
      }
    } else {
      console.log("Hindi language — skipping transliteration");
    }

    console.log("STEP 2 COMPLETE");
    console.log("Converted texts:", convertedTexts);

    // ─────────────────────────────
    // STEP 3 — AI TEXT REPLACEMENT ON TEMPLATE ONLY
    // AI receives only the clean template — no person, no products.
    // This prevents AI from altering the uploaded person's face.
    // ─────────────────────────────

    console.log("STEP 3: Replacing text on template (AI — no person)...");

    let translatedTemplatePath;

    try {
      translatedTemplatePath = await replaceTemplateText({
        templatePath: TEMPLATE_PATH,
        sourceTexts: SOURCE_TEXTS,
        convertedTexts,
      });
    } catch (templateError) {
      console.warn(
        `Template text replacement failed, using original: ${templateError.message}`,
      );
      translatedTemplatePath = TEMPLATE_PATH;
    }

    console.log(
      "STEP 3 COMPLETE — translated template:",
      translatedTemplatePath,
    );

    // ─────────────────────────────
    // STEP 4 — SHARP COMPOSITE
    // Person + products composited onto the already-translated template.
    // AI never touches this step — face is pixel-locked by Sharp.
    // ─────────────────────────────

    console.log(
      "STEP 4: Compositing person + products onto translated template...",
    );

    let finalBannerBuffer;

    try {
      finalBannerBuffer = await replacePersonInBanner({
        templatePath: translatedTemplatePath, // ← translated template, not original
        personBuffer: removedBgBuffer,
      });
    } catch (compositeError) {
      throw new Error(`Banner compositing failed: ${compositeError.message}`);
    }

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

//new ocmment

// import fs from "fs";
// import path from "path";

// import { removeBackgroundOpenAI } from "../openai/removeBg.service.js";
// import { transliterateTagline } from "../openai/transliterate.service.js";
// import { replacePersonInBanner } from "../image/replacePerson.service.js";
// import { saveImage } from "../image/saveImage.service.js";
// import { createTempFile } from "../../utils/createTempFile.js";

// // ORIGINAL HINDI TAGLINE
// const SOURCE_TAGLINE = "हर मौसम में घर की फुलप्रूफ सुरक्षा के लिए";

// // TEMPLATE PATH
// const TEMPLATE_PATH = "public/templates/templatebg.jpeg";

// // DEBUG OUTPUT DIR — remove this after testing
// const DEBUG_DIR = "public/debug";

// export const generateBanner = async ({
//   personBuffer,
//   language,
//   originalName,
// }) => {
//   console.log("=== generateBanner START ===");
//   console.log("Language:", language);
//   console.log("Original file:", originalName);

//   // validate template
//   if (!fs.existsSync(TEMPLATE_PATH)) {
//     throw new Error(`Template not found: ${TEMPLATE_PATH}`);
//   }

//   // create debug dir if not exists
//   if (!fs.existsSync(DEBUG_DIR)) {
//     fs.mkdirSync(DEBUG_DIR, { recursive: true });
//   }

//   // get extension
//   const ext = path.extname(originalName).toLowerCase() || ".jpg";
//   console.log("Detected extension:", ext);

//   // create temp file
//   const tempPath = await createTempFile(
//     personBuffer,
//     `person-${Date.now()}${ext}`,
//   );
//   console.log("Temp file created:", tempPath);

//   try {
//     // ─────────────────────────────
//     // STEP 1 — REMOVE BACKGROUND
//     // ─────────────────────────────

//     console.log("STEP 1: Removing background...");

//     let removedBgBuffer;

//     try {
//       removedBgBuffer = await removeBackgroundOpenAI(tempPath);
//     } catch (bgError) {
//       throw new Error(`Background removal failed: ${bgError.message}`);
//     }

//     console.log("STEP 1 COMPLETE");

//     // ─────────────────────────────
//     // DEBUG — Save remove.bg output
//     // Check public/debug/step1_nobg.png to verify face
//     // Remove this block after testing
//     // ─────────────────────────────

//     const debugPath = path.join(DEBUG_DIR, "step1_nobg.png");
//     fs.writeFileSync(debugPath, removedBgBuffer);
//     console.log(`DEBUG: remove.bg output saved → ${debugPath}`);
//     console.log(
//       "DEBUG: Check this file — if face is wrong here, issue is in remove.bg",
//     );
//     console.log(
//       "DEBUG: If face looks correct here, issue is in Sharp compositing",
//     );

//     // STOP HERE FOR NOW — comment out steps 2,3,4 below to isolate
//     // return debugPath; // ← uncomment this to stop after remove.bg

//     // ─────────────────────────────
//     // STEP 2 — TRANSLITERATE TEXT
//     // ─────────────────────────────

//     console.log("STEP 2: Converting tagline script...");

//     let convertedTagline;

//     try {
//       convertedTagline = await transliterateTagline({
//         text: SOURCE_TAGLINE,
//         language,
//       });
//     } catch (textError) {
//       console.warn(`Transliteration failed: ${textError.message}`);
//       convertedTagline = SOURCE_TAGLINE;
//     }

//     console.log("Converted tagline:", convertedTagline);

//     // ─────────────────────────────
//     // STEP 3 — BANNER COMPOSITE
//     // ─────────────────────────────

//     console.log("STEP 3: Banner generation...");

//     let finalBannerBuffer;

//     try {
//       finalBannerBuffer = await replacePersonInBanner({
//         templatePath: TEMPLATE_PATH,
//         personBuffer: removedBgBuffer,
//         tagline: convertedTagline,
//       });
//     } catch (aiError) {
//       throw new Error(`Banner generation failed: ${aiError.message}`);
//     }

//     // DEBUG — Save final composite before saving to DB
//     const debugFinalPath = path.join(DEBUG_DIR, "step3_final_banner.jpg");
//     fs.writeFileSync(debugFinalPath, finalBannerBuffer);
//     console.log(`DEBUG: Final banner saved → ${debugFinalPath}`);

//     console.log("STEP 3 COMPLETE");

//     // ─────────────────────────────
//     // STEP 4 — SAVE IMAGE
//     // ─────────────────────────────

//     console.log("STEP 4: Saving image...");

//     const savedPath = await saveImage(finalBannerBuffer);

//     console.log("Saved:", savedPath);
//     console.log("=== generateBanner DONE ===");

//     return savedPath;
//   } finally {
//     if (fs.existsSync(tempPath)) {
//       fs.unlinkSync(tempPath);
//       console.log("Temp file deleted:", tempPath);
//     }
//   }
// };

//old one start

// import fs from "fs";
// import path from "path";

// import { removeBackgroundOpenAI } from "../openai/removeBg.service.js";
// import { transliterateTagline } from "../openai/transliterate.service.js";
// import { replacePersonInBanner } from "../image/replacePerson.service.js";
// import { saveImage } from "../image/saveImage.service.js";
// import { createTempFile } from "../../utils/createTempFile.js";

// // ORIGINAL HINDI TAGLINE
// const SOURCE_TAGLINE = "हर मौसम में घर की फुलप्रूफ सुरक्षा के लिए";

// // TEMPLATE PATH
// const TEMPLATE_PATH = "public/templates/templatebg.jpeg";
// // const TEMPLATE_PATH = "public/templates/template1.jpeg";

// /**
//  * FULL PIPELINE
//  *
//  * 1. Remove background
//  * 2. Transliterate tagline
//  * 3. AI replaces:
//  *      - person
//  *      - headline
//  * 4. Save final image
//  */
// export const generateBanner = async ({
//   personBuffer,
//   language,
//   originalName,
// }) => {
//   console.log("=== generateBanner START ===");

//   console.log("Language:", language);

//   console.log("Original file:", originalName);

//   // validate template
//   if (!fs.existsSync(TEMPLATE_PATH)) {
//     throw new Error(`Template not found: ${TEMPLATE_PATH}`);
//   }

//   // get extension
//   const ext = path.extname(originalName).toLowerCase() || ".jpg";

//   console.log("Detected extension:", ext);

//   // create temp file
//   const tempPath = await createTempFile(
//     personBuffer,
//     `person-${Date.now()}${ext}`,
//   );

//   console.log("Temp file created:", tempPath);

//   try {
//     // ─────────────────────────────
//     // STEP 1 — REMOVE BACKGROUND
//     // ─────────────────────────────

//     console.log("STEP 1: Removing background...");

//     let removedBgBuffer;

//     try {
//       removedBgBuffer = await removeBackgroundOpenAI(tempPath);
//     } catch (bgError) {
//       throw new Error(`Background removal failed: ${bgError.message}`);
//     }

//     console.log("STEP 1 COMPLETE");

//     // ─────────────────────────────
//     // STEP 2 — TRANSLITERATE TEXT
//     // ─────────────────────────────

//     console.log("STEP 2: Converting tagline script...");

//     let convertedTagline;

//     try {
//       convertedTagline = await transliterateTagline({
//         text: SOURCE_TAGLINE,

//         language,
//       });
//     } catch (textError) {
//       console.warn(`Transliteration failed: ${textError.message}`);

//       // fallback
//       convertedTagline = SOURCE_TAGLINE;
//     }

//     console.log("Converted tagline:", convertedTagline);

//     // ─────────────────────────────
//     // STEP 3 — AI BANNER EDIT
//     // ─────────────────────────────

//     console.log("STEP 3: AI banner generation...");

//     let finalBannerBuffer;

//     try {
//       finalBannerBuffer = await replacePersonInBanner({
//         templatePath: TEMPLATE_PATH,

//         personBuffer: removedBgBuffer,

//         tagline: convertedTagline,
//       });
//     } catch (aiError) {
//       throw new Error(`AI banner generation failed: ${aiError.message}`);
//     }

//     console.log("STEP 3 COMPLETE");

//     // ─────────────────────────────
//     // STEP 4 — SAVE IMAGE
//     // ─────────────────────────────

//     console.log("STEP 4: Saving image...");

//     const savedPath = await saveImage(finalBannerBuffer);

//     console.log("Saved:", savedPath);

//     console.log("=== generateBanner DONE ===");

//     return savedPath;
//   } finally {
//     // cleanup temp file
//     if (fs.existsSync(tempPath)) {
//       fs.unlinkSync(tempPath);

//       console.log("Temp file deleted:", tempPath);
//     }
//   }
// };

//old one end
// below is the old start

// import fs from "fs";
// import path from "path";

// import { removeBackgroundOpenAI } from "../openai/removeBg.service.js";
// import { translateTagline } from "../openai/translate.service.js";
// import { transliterateTagline } from "../openai/transliterate.service.js";
// import { placePersonOnBanner } from "../image/placePerson.service.js";
// import { replacePersonInBanner } from "../image/replacePerson.service.js";
// import { replaceBannerText } from "../image/replaceText.service.js";
// import { saveImage } from "../image/saveImage.service.js";
// import { createTempFile } from "../../utils/createTempFile.js";

// const SOURCE_TAGLINE = "हर मौसम में घर की फुलप्रूफ सुरक्षा के लिए";
// const TEMPLATE_PATH = "public/templates/template1.jpeg";

// /**
//  * Full pipeline: person image → remove bg → place on banner → translate text → save
//  *
//  * @param {Buffer} personBuffer - Raw image buffer of the uploaded person photo
//  * @param {string} language - Target language for the tagline
//  * @param {string} originalName - Original filename (used to detect extension)
//  * @returns {string} - Saved image path (relative, e.g. /uploads/dealers/banner-xxx.png)
//  */
// export const generateBanner = async ({
//   personBuffer,
//   language,
//   originalName,
// }) => {
//   console.log("=== generateBanner START ===");
//   console.log("Language:", language);
//   console.log("Original file:", originalName);

//   // Validate template exists
//   if (!fs.existsSync(TEMPLATE_PATH)) {
//     throw new Error(`Template not found at path: ${TEMPLATE_PATH}`);
//   }

//   // Get real extension from original filename
//   const ext = path.extname(originalName).toLowerCase() || ".jpg";
//   console.log("Detected extension:", ext);

//   // Write uploaded buffer to a temp file (needed for bg removal)
//   const tempPath = await createTempFile(
//     personBuffer,
//     `person-${Date.now()}${ext}`,
//   );
//   console.log("Temp file created:", tempPath);

//   try {
//     // STEP 1 — Remove background from person image
//     console.log("Step 1: Removing background...");
//     let removedBgBuffer;
//     try {
//       removedBgBuffer = await removeBackgroundOpenAI(tempPath);
//     } catch (bgError) {
//       throw new Error(`Background removal failed: ${bgError.message}`);
//     }
//     console.log("Step 1 complete: background removed");

//     // STEP 2 — Place person on banner template
//     console.log("Step 2: Placing person on banner...");
//     let bannerBuffer;
//     try {
//       bannerBuffer = await replacePersonInBanner({
//         templatePath: TEMPLATE_PATH,
//         personBuffer: removedBgBuffer,
//       });
//     } catch (placeError) {
//       throw new Error(`Person placement failed: ${placeError.message}`);
//     }
//     console.log("Step 2 complete: person placed on banner");

//     // STEP 3 — Translate tagline
//     console.log("Step 3: Translating tagline...");
//     let translated;
//     try {
//       translated = await transliterateTagline({
//         text: SOURCE_TAGLINE,
//         language,
//       });
//     } catch (translateError) {
//       // Non-fatal: fall back to original Hindi tagline if translation fails
//       console.warn(
//         `Translation failed, using original text. Error: ${translateError.message}`,
//       );
//       translated = SOURCE_TAGLINE;
//     }
//     console.log("Step 3 complete: translation =", translated);

//     // STEP 4 — Replace banner text with translated version
//     console.log("Step 4: Replacing banner text...");
//     let finalBanner;
//     try {
//       finalBanner = await replaceBannerText({
//         imageBuffer: bannerBuffer,
//         translatedText: translated,
//       });
//     } catch (textError) {
//       throw new Error(`Text replacement failed: ${textError.message}`);
//     }
//     console.log("Step 4 complete: text replaced");

//     // STEP 5 — Save to disk
//     console.log("Step 5: Saving final banner...");
//     const savedPath = await saveImage(finalBanner);
//     console.log("Step 5 complete: saved to", savedPath);

//     console.log("=== generateBanner DONE ===");
//     return savedPath;
//   } finally {
//     // Always clean up temp file regardless of success or failure
//     if (fs.existsSync(tempPath)) {
//       fs.unlinkSync(tempPath);
//       console.log("Temp file cleaned up:", tempPath);
//     }
//   }
// };
