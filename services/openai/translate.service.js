import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Translates a marketing tagline into the specified language.
 *
 * @param {string} text - The source text to translate
 * @param {string} language - Target language (e.g. "HINDI", "ENGLISH", "PUNJABI")
 * @returns {string} - Translated tagline, sanitized
 */
export const translateTagline = async ({ text, language }) => {

  // If language is HINDI, no translation needed — return original
  if (language?.toUpperCase() === "HINDI") {
    console.log("Language is HINDI, skipping translation");
    return text;
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",

    messages: [
      {
        role: "system",
        content:
          "You are a professional marketing translator. " +
          "You return ONLY the translated text — no quotes, no labels, no explanations, no punctuation wrappers.",
      },

      {
        role: "user",
        content: `
Translate this tagline into ${language}.

Text:
"${text}"

Rules:
- Keep the marketing tone
- Keep it short (same length as original approximately)
- Return ONLY the translated text
- No quotes around the result
- No prefix like "Translation:" or "Result:"
- No explanations
`,
      },
    ],

    temperature: 0.3,   // lower = more consistent, less creative
    max_tokens: 120,
  });

  const raw = response.choices[0].message.content ?? "";

  // Sanitize: remove wrapping quotes, common prefix labels, extra whitespace
  const sanitized = raw
    .trim()
    .replace(/^["'"'""]|["'"'""]$/g, "")          // remove wrapping quotes (incl. curly quotes)
    .replace(/^(Translation|Result|Output)\s*:\s*/i, "") // remove prefix labels
    .replace(/\n+/g, " ")                           // collapse newlines to space
    .trim();

  console.log(`Translated (${language}): "${sanitized}"`);

  return sanitized || text; // fallback to original if result is empty
};



// import OpenAI from "openai";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// export const translateTagline = async ({
//   text,
//   language,
// }) => {
//   const response = await openai.chat.completions.create({
//     model: "gpt-4.1-mini",

//     messages: [
//       {
//         role: "system",
//         content:
//           "You are a professional marketing translator.",
//       },

//       {
//         role: "user",
//         content: `
// Translate this tagline into ${language}.

// Text:
// "${text}"

// Rules:
// - Keep marketing tone
// - Keep short
// - Return only translated text
// `,
//       },
//     ],
//   });

//   return response.choices[0].message.content.trim();
// };