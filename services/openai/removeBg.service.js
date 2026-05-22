import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import FormData from "form-data";

/**
 * Removes background from an image using OpenAI's gpt-image-1 background removal.
 * Falls back to remove.bg API if REMOVE_BG_API_KEY is set.
 *
 * @param {string} imagePath - Absolute path to the input image
 * @returns {Buffer} - PNG buffer with transparent background
 */
export const removeBackgroundOpenAI = async (imagePath) => {
  console.log("image path", imagePath);

  const buffer = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).toLowerCase();

  // Resolve correct MIME type from extension
  const mimeMap = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  };
  const mimeType = mimeMap[ext] || "image/jpeg";

  // --- STRATEGY: Use remove.bg if API key available (most reliable) ---
  if (process.env.REMOVE_BG_API_KEY) {
    return await removeBackgroundWithRemoveBg(buffer, mimeType);
  }

  // --- FALLBACK: Use OpenAI image generation to isolate the person ---
  // NOTE: openai.images.edit() is an inpainting API and requires a mask.
  // The correct approach for background removal via OpenAI is to use
  // gpt-image-1 with a detailed prompt to re-render on transparent bg.
  // return await removeBackgroundWithOpenAI(buffer, mimeType, ext);
};

/**
 * Uses remove.bg API — most reliable background removal
 */
const removeBackgroundWithRemoveBg = async (buffer, mimeType) => {
  console.log("Using remove.bg for background removal");

  const formData = new FormData();
  formData.append("image_file", buffer, {
    filename: "image.jpg",
    contentType: mimeType,
  });
  formData.append("size", "auto");

  const response = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: {
      "X-Api-Key": process.env.REMOVE_BG_API_KEY,
      ...formData.getHeaders(),
    },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`remove.bg API error: ${response.status} — ${errText}`);
  }

  // const resultBuffer = await response.buffer();
  const arrayBuffer = await response.arrayBuffer();

const resultBuffer = Buffer.from(arrayBuffer);
  console.log("Background removed via remove.bg");
  return resultBuffer; // Returns PNG with transparent background
};

/**
 * Uses OpenAI gpt-image-1 edit with a white mask to isolate the person.
 * This is a best-effort fallback — remove.bg is more reliable.
 */
// const removeBackgroundWithOpenAI = async (buffer, mimeType, ext) => {
//   console.log("Using OpenAI gpt-image-1 for background removal");

//   // Dynamic import to avoid errors if openai not installed
//   const { default: OpenAI, toFile } = await import("openai");

//   const openai = new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY,
//   });

//   // OpenAI images.edit requires PNG for transparent output
//   // Convert to PNG first using sharp if needed
//   let pngBuffer = buffer;
//   if (ext !== ".png") {
//     const sharp = (await import("sharp")).default;
//     pngBuffer = await sharp(buffer).png().toBuffer();
//   }

//   const imageFile = await toFile(pngBuffer, "person.png", {
//     type: "image/png",
//   });

//   // Create an all-white mask (tells OpenAI: edit entire image)
//   const sharp = (await import("sharp")).default;
//   const { width, height } = await sharp(pngBuffer).metadata();

//   const maskBuffer = await sharp({
//     create: {
//       width,
//       height,
//       channels: 4,
//       background: { r: 255, g: 255, b: 255, alpha: 255 },
//     },
//   })
//     .png()
//     .toBuffer();

//   const maskFile = await toFile(maskBuffer, "mask.png", {
//     type: "image/png",
//   });

//   const result = await openai.images.edit({
//     model: "gpt-image-1",
//     image: imageFile,
//     mask: maskFile,
//     prompt: `
//       Extract ONLY the person from this image.
//       Make the entire background completely transparent.
//       Keep the person's body, face, hair, and clothing perfectly intact.
//       Output: transparent PNG with only the person visible.
//     `,
//     n: 1,
//     size: "1024x1024",
//   });

//   const image_base64 = result.data[0].b64_json;
//   console.log("Background removed via OpenAI");
//   return Buffer.from(image_base64, "base64");
// };
