import fs from "fs";
import path from "path";
import OpenAI, { toFile } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// DEBUG OUTPUT DIR
const DEBUG_DIR = "public/debug";
const TRANSLATED_TEMPLATE_PATH = path.join(DEBUG_DIR, "step3_template_translated.jpeg");

/**
 * Replaces all Hindi text strings in the banner template using AI.
 *
 * IMPORTANT: This function receives ONLY the clean template image —
 * no person, no products. This guarantees AI cannot alter the dealer's
 * face or any composited element added later by Sharp.
 *
 * @param {string} templatePath     - Path to the original template file
 * @param {Object} sourceTexts      - Map of key → original Hindi string
 * @param {Object} convertedTexts   - Map of key → transliterated string
 * @returns {string}                - Path to the translated template (or original if no changes)
 */
export const replaceTemplateText = async ({
  templatePath,
  sourceTexts,
  convertedTexts,
}) => {
  // ─────────────────────────────────────────
  // Check if anything actually changed
  // If all texts are identical (Hindi language), skip AI entirely
  // ─────────────────────────────────────────

  const changedEntries = Object.keys(sourceTexts).filter(
    (k) => sourceTexts[k] !== convertedTexts[k],
  );

  if (changedEntries.length === 0) {
    console.log("replaceTemplateText: No text changes needed — returning original template");
    return templatePath;
  }

  console.log(`replaceTemplateText: Replacing ${changedEntries.length} text(s) via AI...`);

  // ─────────────────────────────────────────
  // Build replacement instruction list for the AI prompt
  // ─────────────────────────────────────────

  const replacementLines = changedEntries
    .map((k) => `• "${sourceTexts[k]}"  →  "${convertedTexts[k]}"`)
    .join("\n");

  console.log("Replacements to apply:\n" + replacementLines);

  // ─────────────────────────────────────────
  // Read template and send to AI
  // ─────────────────────────────────────────

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}`);
  }

  const templateBuffer = fs.readFileSync(templatePath);

  const templateFile = await toFile(templateBuffer, "template.jpeg", {
    type: "image/jpeg",
  });

  const result = await openai.images.edit({
    model: "gpt-image-1",
    image: [templateFile],
    prompt: `
You are doing ONE task only: replace specific text strings in this banner image.

Make ONLY these exact text replacements:
${replacementLines}

RULES FOR EACH REPLACEMENT:
- Find the original Hindi text in the image and replace it with the new text
- Keep the EXACT same position as the original text
- Keep the EXACT same font size
- Keep the EXACT same font weight (bold/regular)
- Keep the EXACT same text color (white or as shown)
- Keep the EXACT same alignment (center/left)
- Keep the EXACT same line breaks

SPECIAL RULE FOR "मेरा भरोसा":
- This text appears inside a white badge/logo shape in the banner
- Replace ONLY the text characters — keep the badge shape, background, and all surrounding elements completely unchanged
- "मेरा भरोसा" is user-facing text, NOT a protected brand name — it must be replaced

DO NOT CHANGE ANYTHING ELSE:
- Do NOT change NUVOCO, ZERO M, IWC+, or any other brand names
- Do NOT change any icons, symbols, or graphic elements
- Do NOT change the background, colors, or layout
- Do NOT move or resize any element
- Do NOT add or remove any visual element

Only the specified text characters change. Everything else stays pixel-identical.
    `.trim(),
    size: "1024x1536",
  });

  // ─────────────────────────────────────────
  // Save translated template buffer to disk
  // ─────────────────────────────────────────

  if (!fs.existsSync(DEBUG_DIR)) {
    fs.mkdirSync(DEBUG_DIR, { recursive: true });
  }

  const translatedBuffer = Buffer.from(result.data[0].b64_json, "base64");
  fs.writeFileSync(TRANSLATED_TEMPLATE_PATH, translatedBuffer);

  console.log(`replaceTemplateText: Translated template saved → ${TRANSLATED_TEMPLATE_PATH}`);

  return TRANSLATED_TEMPLATE_PATH;
};
