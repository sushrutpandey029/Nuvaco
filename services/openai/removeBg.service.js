// import fs from "fs";
// import path from "path";
// import axios from "axios";
// import sharp from "sharp";

// export const removeBackgroundOpenAI = async (imagePath) => {
//   console.log("image path", imagePath);
//   const buffer = fs.readFileSync(imagePath);

//   if (process.env.PIXELCUT_API_KEY) {
//     return await removeBackgroundWithPixelcut(buffer);
//   }

//   throw new Error("PIXELCUT_API_KEY missing");
// };

// const removeBackgroundWithPixelcut = async (buffer) => {
//   console.log("Using Pixelcut API");

//   const tempFileName = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
//   const tempFilePath = path.join("public", "debug", tempFileName);
//   const tempFileUrl  = `${process.env.SERVER_BASE_URL}/debug/${tempFileName}`;

//   try {
//     const jpegBuffer = await sharp(buffer)
//       .resize({ width: 1500, withoutEnlargement: true })
//       .jpeg({ quality: 90 })
//       .toBuffer();

//     console.log("JPEG size:", (jpegBuffer.length / 1024 / 1024).toFixed(2), "MB");

//     // Save to public folder so Pixelcut can reach it
//     fs.writeFileSync(tempFilePath, jpegBuffer);
//     console.log("Temp URL:", tempFileUrl);

//     // Verify URL is reachable before calling Pixelcut
//     try {
//       const testRes = await axios.get(tempFileUrl, {
//         headers: { "ngrok-skip-browser-warning": "true" },
//         timeout: 5000,
//       });
//       console.log("URL reachable ✅ status:", testRes.status, "size:", testRes.data.length);
//     } catch (e) {
//       console.log("URL NOT reachable ❌:", e.message);
//     }

//     // Call Pixelcut with public URL
//     const response = await axios.post(
//       "https://api.developer.pixelcut.ai/v1/remove-background",
//       { image_url: tempFileUrl, format: "png" },
//       {
//         headers: {
//           "Content-Type": "application/json",
//           "Accept": "application/json",
//           "X-API-KEY": process.env.PIXELCUT_API_KEY,
//         },
//       }
//     );

//     console.log("Pixelcut status:", response.status);
//     const { result_url } = response.data;

//     if (!result_url) {
//       throw new Error(`No result_url: ${JSON.stringify(response.data)}`);
//     }

//     // Download the result
//     const imageResponse = await axios.get(result_url, {
//       responseType: "arraybuffer",
//     });

//     console.log("Result size:", imageResponse.data.byteLength, "bytes");
//     return Buffer.from(imageResponse.data);

//   } catch (error) {
//     const errData = error.response?.data;
//     const errMsg =
//       errData instanceof Buffer || errData instanceof ArrayBuffer
//         ? Buffer.from(errData).toString("utf8")
//         : typeof errData === "object"
//         ? JSON.stringify(errData)
//         : errData ?? error.message;

//     console.log("Pixelcut Error status:", error.response?.status);
//     console.log("Pixelcut Error detail:", errMsg);
//     throw new Error(`Pixelcut API failed: ${errMsg}`);

//   } finally {
//     // Always delete temp file
//     if (fs.existsSync(tempFilePath)) {
//       fs.unlinkSync(tempFilePath);
//       console.log("Temp file deleted");
//     }
//   }
// };
//pixekcut old below

// import fs from "fs";
// import path from "path";
// import axios from "axios";
// import FormData from "form-data";

// /**
//  * Removes background using Pixelcut API
//  */
// export const removeBackgroundOpenAI = async (imagePath) => {
//   console.log("image path", imagePath);

//   const buffer = fs.readFileSync(imagePath);
//   const ext = path.extname(imagePath).toLowerCase();

//   const mimeMap = {
//     ".jpg": "image/jpeg",
//     ".jpeg": "image/jpeg",
//     ".png": "image/png",
//     ".webp": "image/webp",
//   };

//   const mimeType = mimeMap[ext] || "image/jpeg";

//   // USE PIXELCUT
//   if (process.env.PIXELCUT_API_KEY) {
//     return await removeBackgroundWithPixelcut(buffer, mimeType);
//   }

//   throw new Error("PIXELCUT_API_KEY missing");
// };

// /**
//  * Pixelcut background removal
//  */
// const removeBackgroundWithPixelcut = async (
//   buffer,
//   mimeType
// ) => {
//   console.log("Using Pixelcut API");

//   try {
//     const formData = new FormData();

//     formData.append(
//       "image_file",
//       buffer,
//       {
//         filename: "image.jpg",
//         contentType: mimeType,
//       }
//     );
//     console.log("mimeType:", mimeType);
// console.log("buffer size:", buffer.length);

//     const response = await axios.post(
//       "https://api.developer.pixelcut.ai/v1/remove-background",
//       formData,
//       {
//         headers: {
//           ...formData.getHeaders(),
//           "X-API-KEY":
//             process.env.PIXELCUT_API_KEY,
//         },
//         responseType: "arraybuffer",
//         maxBodyLength: Infinity,
//       }
//     );

//     const resultBuffer = Buffer.from(
//       response.data
//     );

//     console.log(
//       "Background removed via Pixelcut"
//     );

//     return resultBuffer;
//   } catch (error) {
//     console.log(
//       "Pixelcut Error:",
//       error.response?.data?.toString() ||
//         error.message
//     );

//     throw new Error("Pixelcut API failed");
//   }
// };

//remove bg is below

// import fs from "fs";
// import path from "path";
// import fetch from "node-fetch";
// import FormData from "form-data";

// /**
//  * Removes background from an image using OpenAI's gpt-image-1 background removal.
//  * Falls back to remove.bg API if REMOVE_BG_API_KEY is set.
//  *
//  * @param {string} imagePath - Absolute path to the input image
//  * @returns {Buffer} - PNG buffer with transparent background
//  */
// export const removeBackgroundOpenAI = async (imagePath) => {
//   console.log("image path", imagePath);

//   const buffer = fs.readFileSync(imagePath);
//   const ext = path.extname(imagePath).toLowerCase();

//   // Resolve correct MIME type from extension
//   const mimeMap = {
//     ".jpg": "image/jpeg",
//     ".jpeg": "image/jpeg",
//     ".png": "image/png",
//     ".webp": "image/webp",
//   };
//   const mimeType = mimeMap[ext] || "image/jpeg";

//   // --- STRATEGY: Use remove.bg if API key available (most reliable) ---
//   if (process.env.REMOVE_BG_API_KEY) {
//     return await removeBackgroundWithRemoveBg(buffer, mimeType);
//   }

//   // --- FALLBACK: Use OpenAI image generation to isolate the person ---
//   // NOTE: openai.images.edit() is an inpainting API and requires a mask.
//   // The correct approach for background removal via OpenAI is to use
//   // gpt-image-1 with a detailed prompt to re-render on transparent bg.
//   // return await removeBackgroundWithOpenAI(buffer, mimeType, ext);
// };

// /**
//  * Uses remove.bg API — most reliable background removal
//  */
// const removeBackgroundWithRemoveBg = async (buffer, mimeType) => {
//   console.log("Using remove.bg for background removal");

//   const formData = new FormData();
//   formData.append("image_file", buffer, {
//     filename: "image.jpg",
//     contentType: mimeType,
//   });
//   formData.append("size", "auto");

//   const response = await fetch("https://api.remove.bg/v1.0/removebg", {
//     method: "POST",
//     headers: {
//       "X-Api-Key": process.env.REMOVE_BG_API_KEY,
//       ...formData.getHeaders(),
//     },
//     body: formData,
//   });

//   if (!response.ok) {
//     const errText = await response.text();
//     throw new Error(`remove.bg API error: ${response.status} — ${errText}`);
//   }

//   // const resultBuffer = await response.buffer();
//   const arrayBuffer = await response.arrayBuffer();

//   const resultBuffer = Buffer.from(arrayBuffer);
//   console.log("Background removed via remove.bg");
//   return resultBuffer; // Returns PNG with transparent background
// };

//remvoe bbg new

// import fs from "fs";
// import path from "path";
// import fetch from "node-fetch";
// import FormData from "form-data";

// const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// export const removeBackgroundOpenAI = async (imagePath) => {
//   console.log("image path", imagePath);

//   const buffer = fs.readFileSync(imagePath);
//   const ext = path.extname(imagePath).toLowerCase();

//   const mimeMap = {
//     ".jpg": "image/jpeg",
//     ".jpeg": "image/jpeg",
//     ".png": "image/png",
//     ".webp": "image/webp",
//   };
//   const mimeType = mimeMap[ext] || "image/jpeg";

//   if (process.env.REMOVE_BG_API_KEY) {
//     return await removeBackgroundWithRemoveBg(buffer, mimeType);
//   }

//   throw new Error("REMOVE_BG_API_KEY missing");
// };

// const removeBackgroundWithRemoveBg = async (buffer, mimeType, retries = 3) => {
//   console.log("Using remove.bg for background removal");

//   for (let attempt = 1; attempt <= retries; attempt++) {
//     try {
//       const formData = new FormData();
//       formData.append("image_file", buffer, {
//         filename: "image.jpg",
//         contentType: mimeType,
//       });
//       formData.append("size", "auto");

//       const response = await fetch("https://api.remove.bg/v1.0/removebg", {
//         method: "POST",
//         headers: {
//           "X-Api-Key": process.env.REMOVE_BG_API_KEY,
//           ...formData.getHeaders(),
//         },
//         body: formData,
//       });

//       // Rate limited — wait and retry
//       if (response.status === 429) {
//         const waitTime = attempt * 5000; // 5s, 10s, 15s
//         console.log(`Rate limited. Attempt ${attempt}/${retries}. Waiting ${waitTime/1000}s...`);
//         await sleep(waitTime);
//         continue;
//       }

//       if (!response.ok) {
//         const errText = await response.text();
//         throw new Error(`remove.bg API error: ${response.status} — ${errText}`);
//       }

//       const arrayBuffer = await response.arrayBuffer();
//       const resultBuffer = Buffer.from(arrayBuffer);
//       console.log("Background removed via remove.bg");
//       return resultBuffer;

//     } catch (error) {
//       // If it's a rate limit error from the throw above, don't retry
//       if (attempt === retries) throw error;
//       // For network errors, wait and retry
//       console.log(`Attempt ${attempt} failed: ${error.message}. Retrying...`);
//       await sleep(attempt * 3000);
//     }
//   }

//   throw new Error("remove.bg failed after all retries");
// };

//pixian api

import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import sharp from "sharp";

export const removeBackgroundOpenAI = async (imagePath) => {
  console.log("image path", imagePath);
  const buffer = fs.readFileSync(imagePath);

  if (process.env.PIXIAN_API_ID && process.env.PIXIAN_API_SECRET) {
    return await removeBackgroundWithPixian(buffer);
  }

  throw new Error("PIXIAN_API_ID or PIXIAN_API_SECRET missing");
};

const removeBackgroundWithPixian = async (buffer) => {
  console.log("Using Pixian.AI for background removal");

  try {
    const jpegBuffer = await sharp(buffer)
      .rotate() // ← auto-rotate based on EXIF, then strip EXIF
      .resize({ width: 1500, withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();

    console.log(
      "JPEG size:",
      (jpegBuffer.length / 1024 / 1024).toFixed(2),
      "MB",
    );

    const formData = new FormData();
    formData.append("image", jpegBuffer, {
      filename: "image.jpg",
      contentType: "image/jpeg",
    });
    formData.append("test", "true"); // remove in production

    const response = await axios.post(
      "https://api.pixian.ai/api/v2/remove-background",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        auth: {
          username: process.env.PIXIAN_API_ID,
          password: process.env.PIXIAN_API_SECRET,
        },
        responseType: "arraybuffer",
      },
    );

    console.log("✅ Pixian success:", response.status);
    console.log("Result size:", response.data.byteLength, "bytes");

    return Buffer.from(response.data);
  } catch (error) {
    const errData = error.response?.data;
    const errMsg =
      errData instanceof Buffer || errData instanceof ArrayBuffer
        ? Buffer.from(errData).toString("utf8")
        : typeof errData === "object"
          ? JSON.stringify(errData)
          : (errData ?? error.message);

    console.log("Pixian Error status:", error.response?.status);
    console.log("Pixian Error detail:", errMsg);
    throw new Error(`Pixian API failed: ${errMsg}`);
  }
};
