import fs from "fs";

import { ai } from "./gemini.service.js";

export const enhanceWithGemini = async (imagePath) => {
  // read image
  const imageBytes = fs.readFileSync(imagePath);

  // convert image to base64
  const base64Image = imageBytes.toString("base64");

  // Gemini image generation
  const response = await ai.models.generateContent({
    model: "'imagen-4.0-generate-001",

    contents: [
      {
        inlineData: {
          mimeType: "image/png",
          data: base64Image,
        },
      },

      {
        text: `
          Make this banner look like a professional advertisement.

          Blend the person naturally into the background.
          Match lighting and shadows.
          Improve realism.

          Keep all text unchanged.
          Preserve branding and layout.
          Do not modify template design.
        `,
      },
    ],
  });

  console.log("respo of api", response);

  // safety check
  if (!response.candidates || !response.candidates.length) {
    throw new Error("No response from Gemini");
  }

  // get content parts
  const parts = response.candidates[0].content.parts;

  // find generated image
  const generatedImage = parts.find((part) => part.inlineData);

  if (!generatedImage) {
    console.log("Gemini response:", parts);

    throw new Error("Gemini did not return image data");
  }

  // return image buffer
  return Buffer.from(generatedImage.inlineData.data, "base64");
};
