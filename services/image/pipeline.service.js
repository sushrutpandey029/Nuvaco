

import fs from "fs";
import Dealer from "../../Model/dealerModel.js";
import DealerImage from "../../Model/dealer/DealerImage.js";

import { removeBackground } from "./removeBg.service.js";
import { enhanceImage } from "./enhance.service.js";
import { saveImage } from "./save.service.js";

export const processImagesPipeline = async ({
  files,
  dealer_id,
  language,
  image_ids = [],
}) => {

  // ✅ Dealer validation
  const dealer = await Dealer.findOne({
    where: { id: dealer_id },
    attributes: ["id"],
  });

  if (!dealer) {
    throw new Error("Dealer not found");
  }

  // ✅ Validations
  if (!files || files.length === 0) {
    throw new Error("Images required");
  }

  if (files.length > 4) {
    throw new Error("Only 4 images allowed");
  }

  const results = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const existingId = image_ids[i] ? parseInt(image_ids[i]) : null;

    // 🔥 Step 1: Remove BG
    const bgRemoved = await removeBackground(file.buffer);

    // 🔥 Step 2: Enhance
    const enhanced = await enhanceImage(bgRemoved);

    // 🔥 Step 3: Save processed image
    const imagePath = await saveImage(enhanced);

    if (existingId) {
      // 🔁 UPDATE FLOW
      const existing = await DealerImage.findOne({
        where: { id: existingId, dealer_id },
      });

      if (existing) {
        // 🧹 delete old file
        try {
          if (fs.existsSync(existing.image)) {
            fs.unlinkSync(existing.image);
          }
        } catch (e) {
          console.log("File delete error:", e.message);
        }

        // ✏️ update record
        await existing.update({
          image: imagePath,
          language,
        });

        results.push(existing);
      } else {
        // fallback create
        const created = await DealerImage.create({
          dealer_id,
          language,
          image: imagePath,
        });

        results.push(created);
      }

    } else {
      // 🆕 CREATE FLOW
      const created = await DealerImage.create({
        dealer_id,
        language,
        image: imagePath,
      });

      results.push(created);
    }
  }

  // 🔄 update language for all images
  await DealerImage.update(
    { language },
    { where: { dealer_id } }
  );

  return results;
};



// // services/image/pipeline.service.js
// import { removeBackground } from "./removeBg.service.js";
// import { enhanceImage } from "./enhance.service.js";
// // import { addOverlay } from "./overlay.service.js";
// import { saveImage } from "./save.service.js";
// import DealerImage from "../../Model/dealer/DealerImage.js";

// export const processImagesPipeline = async ({ files, dealer_id, language }) => {
//   const results = await Promise.all(
//     files.map(async (file) => {
//       // Step 1: Remove BG
//       const bgRemoved = await removeBackground(file.buffer);
//       console.log("bgRemoved", bgRemoved);
//       // Step 2: Enhance
//         const enhanced = await enhanceImage(bgRemoved);
// console.log("enhancec",enhanced)
//       // Step 3: Overlay
//       //   const finalImage = await addOverlay(enhanced);

//       // Step 4: Save
//       //   const imagePath = await saveImage(finalImage);
//       const imagePath = await saveImage(enhanced);

//       // Step 5: DB Save
//       return await DealerImage.create({
//         dealer_id,
//         language,
//         image: imagePath,
//       });
//     }),
//   );

//   return results;
// };

