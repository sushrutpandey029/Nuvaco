import fs from "fs";
import OpenAI, { toFile } from "openai";

//   const { data, info } = await sharp(imagePath)
//     .resize({ height: targetHeight, fit: "contain" })
//     .ensureAlpha()
//     .raw()
//     .toBuffer({ resolveWithObject: true });

export const replacePersonInBanner = async ({
  templatePath,
  personBuffer,
  tagline,
}) => {

  // template banner
  const templateBuffer =
    fs.readFileSync(templatePath);

  const templateFile = await toFile(
    templateBuffer,
    "template.jpeg",
    {
      type: "image/jpeg",
    }
  );

  // transparent person png
  const personFile = await toFile(
    personBuffer,
    "person.png",
    {
      type: "image/png",
    }
  );

  // AI EDIT
  const result = await openai.images.edit({
    model: "gpt-image-1",

    image: [
      templateFile,
      personFile,
    ],

prompt: `
You are editing an EXISTING branded advertisement banner.

Your task is EXTREMELY LIMITED.

ONLY modify these TWO things:

1. Replace the existing person in the banner
   with the uploaded person image.

2. Replace ONLY the top Hindi headline text:

"हर मौसम में घर की फुलप्रूफ सुरक्षा के लिए"

with this exact text:

"${tagline}"

STRICT RULES:

- Do NOT redesign the banner
- Do NOT regenerate the background
- Do NOT change product packaging
- Do NOT modify bucket design
- Do NOT modify bottle design
- Do NOT modify labels
- Do NOT modify logos
- Do NOT modify icons
- Do NOT modify house shape
- Do NOT modify colors
- Do NOT modify lighting
- Do NOT modify composition
- Do NOT modify branding
- Do NOT modify layout
- Do NOT modify shadows
- Do NOT modify perspective
- Do NOT modify product text
- Do NOT modify lower graphics
- Do NOT modify watermark/logo areas

The following areas must remain visually identical:
- product bucket
- product bottles
- NUVOCO logo
- ZERO M branding
- IWC+ branding
- left-side waterproof icons
- blue house background

TEXT REPLACEMENT RULES:

- Keep EXACT same headline position
- Keep EXACT same text alignment
- Keep EXACT same font style
- Keep EXACT same font weight
- Keep EXACT same font size
- Keep EXACT same spacing
- Keep EXACT same line breaks
- Keep EXACT same white color
- Keep EXACT same professional typography style

PERSON REPLACEMENT RULES:

- Replace ONLY the original man
- Preserve same pose orientation
- Preserve same placement
- Preserve same scale
- Preserve same body angle
- Blend naturally into banner
- Keep realistic lighting
- Keep professional advertising quality

IMPORTANT:

This is NOT a new design generation task.

This is a MINIMAL EDITING task.

Only replace:
- existing person
- existing headline text

Everything else must remain unchanged and visually identical to the original banner.
`,

    size: "1024x1536",
  });

  const image_base64 =
    result.data[0].b64_json;

  return Buffer.from(
    image_base64,
    "base64"
  );
};


// import fs from "fs";
// import OpenAI, { toFile } from "openai";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// export const replacePersonInBanner = async ({ templatePath, personBuffer }) => {
//   // template image
//   const templateBuffer = fs.readFileSync(templatePath);

//   // convert files
//   const templateFile = await toFile(templateBuffer, "template.png", {
//     type: "image/png",
//   });

//   const personFile = await toFile(personBuffer, "person.png", {
//     type: "image/png",
//   });

//   // AI EDIT
//   const result = await openai.images.edit({
//     model: "gpt-image-1",

//     image: [templateFile, personFile],

//     prompt: `
// Replace the existing person in the banner
// with the uploaded person.

// IMPORTANT:
// - Keep exact banner layout
// - Keep products unchanged
// - Keep logo unchanged
// - Keep house shape unchanged
// - Match same pose position
// - Blend naturally
// - Preserve professional advertisement style
// `,

//     size: "1536x1024",
//   });

//   const image_base64 = result.data[0].b64_json;

//   return Buffer.from(image_base64, "base64");
// };

 