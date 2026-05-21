import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Converts a single Hindi text string into the target language script
 * WITHOUT translating the meaning.
 *
 * Works for all text types in the banner:
 *   - Long headline sentences
 *   - Short brand/product names ("मेरा भरोसा")
 *   - Feature bullets ("जंग प्रूफ", "दरार प्रूफ", "लीकेज प्रूफ")
 *
 * @param {string} text      - Hindi source string
 * @param {string} language  - Target language name (e.g. "Gujarati", "Bengali")
 * @returns {string}         - Transliterated string in target script
 */
export const transliterateTagline = async ({ text, language }) => {
  // Hindi → no conversion needed
  if (language?.toUpperCase() === "HINDI") {
    return text;
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",

    messages: [
      {
        role: "system",
        content: `
You are a professional transliteration engine for Indian regional languages.

YOUR ONLY JOB:
- Convert Hindi (Devanagari script) text into the target language script
- Keep the EXACT same pronunciation and meaning
- Do NOT translate — only convert the writing system
- Preserve marketing tone and feel
- Return ONLY the converted text — no explanation, no quotes, no extra characters
        `.trim(),
      },

      {
        role: "user",
        content: `
Convert the following Hindi text into ${language} script.
Keep pronunciation identical. Do NOT translate the meaning.

Hindi text:
${text}

Examples of correct transliteration:
  घर     → ghar (English romanization)
  घर     → ઘર   (Gujarati script)
  घर     → ঘৰ   (Assamese script)
  जंग    → ਜੰਗ  (Punjabi script)

Return ONLY the converted text. No quotes, no explanation.
        `.trim(),
      },
    ],

    temperature: 0.1,
    max_tokens: 150,
  });

  const result = response.choices[0].message.content
    .trim()
    .replace(/^["'""'']|["'""'']$/g, "") // strip any leading/trailing quote chars
    .trim();

  return result;
};



// import OpenAI from "openai";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// /**
//  * Converts Hindi text into another script/language
//  * WITHOUT translating meaning.
//  *
//  * Example:
//  * घर → ghar (English script)
//  * घर → ঘৰ (Assamese script)
//  */
// export const transliterateTagline = async ({
//   text,
//   language,
// }) => {

//   // Hindi → no conversion needed
//   if (language?.toUpperCase() === "HINDI") {
//     return text;
//   }

//   const response =
//     await openai.chat.completions.create({
//       model: "gpt-4.1-mini",

//       messages: [
//         {
//           role: "system",
//           content: `
// You are a professional transliteration engine.

// IMPORTANT:
// - DO NOT translate meaning
// - ONLY convert script/writing system
// - Keep pronunciation same
// - Preserve marketing tone
// - Return ONLY transliterated text
// `,
//         },

//         {
//           role: "user",
//           content: `
// Convert this Hindi text into ${language} script.

// Text:
// "${text}"

// Examples:
// घर → ghar (English)
// घर → ઘર (Gujarati)
// घर → ঘৰ (Assamese)

// IMPORTANT:
// - Keep pronunciation same
// - Do NOT translate meaning
// - Return ONLY converted text
// `,
//         },
//       ],

//       temperature: 0.1,
//       max_tokens: 120,
//     });

//   return response.choices[0]
//     .message.content
//     .trim()
//     .replace(/^["']|["']$/g, "");
// };