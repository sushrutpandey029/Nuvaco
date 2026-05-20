import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Converts Hindi text into another script/language
 * WITHOUT translating meaning.
 *
 * Example:
 * घर → ghar (English script)
 * घर → ঘৰ (Assamese script)
 */
export const transliterateTagline = async ({
  text,
  language,
}) => {

  // Hindi → no conversion needed
  if (language?.toUpperCase() === "HINDI") {
    return text;
  }

  const response =
    await openai.chat.completions.create({
      model: "gpt-4.1-mini",

      messages: [
        {
          role: "system",
          content: `
You are a professional transliteration engine.

IMPORTANT:
- DO NOT translate meaning
- ONLY convert script/writing system
- Keep pronunciation same
- Preserve marketing tone
- Return ONLY transliterated text
`,
        },

        {
          role: "user",
          content: `
Convert this Hindi text into ${language} script.

Text:
"${text}"

Examples:
घर → ghar (English)
घर → ઘર (Gujarati)
घर → ঘৰ (Assamese)

IMPORTANT:
- Keep pronunciation same
- Do NOT translate meaning
- Return ONLY converted text
`,
        },
      ],

      temperature: 0.1,
      max_tokens: 120,
    });

  return response.choices[0]
    .message.content
    .trim()
    .replace(/^["']|["']$/g, "");
};