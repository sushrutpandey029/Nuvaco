import fs from "fs";

import Dealer from "../../Model/dealerModel.js";
import DealerImage from "../../Model/dealer/DealerImage.js";

import { generateBanner } from "./generateBanner.js";

export const processDealerBannerPipeline = async ({
  files,
  dealer_id,
  language,
  image_ids = [],
}) => {

  // ─────────────────────────────
  // DEALER VALIDATION
  // ─────────────────────────────

  const dealer = await Dealer.findOne({
    where: { id: dealer_id },
    attributes: ["id"],
  });

  if (!dealer) {
    throw new Error("Dealer not found");
  }

  // ─────────────────────────────
  // VALIDATIONS
  // ─────────────────────────────

  if (!files || files.length === 0) {
    throw new Error("Images required");
  }

  if (files.length > 4) {
    throw new Error("Only 4 images allowed");
  }

  // ─────────────────────────────
  // PROCESS IMAGES
  // ─────────────────────────────

  const results = [];

  for (let i = 0; i < files.length; i++) {

    const file = files[i];

    // existing image id from frontend
    const existingImageId = image_ids[i];

    // Add delay between each image (except first)
  if (i > 0) {
    console.log(`Waiting before image ${i + 1}...`);
    await new Promise(resolve => setTimeout(resolve, 5000)); // 2 second gap
  }

    // generate new banner
    const finalImagePath = await generateBanner({
      personBuffer: file.buffer,
      language,
      originalName: file.originalname,
    });

    // ==================================================
    // UPDATE EXISTING IMAGE
    // ==================================================

    if (existingImageId) {

      const existingImage = await DealerImage.findOne({
        where: {
          id: existingImageId,
          dealer_id,
        },
      });

      if (!existingImage) {
        throw new Error("Image not found");
      }

      // delete old image file
      try {

        const oldFilePath = `.${existingImage.image}`;

        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }

      } catch (e) {

        console.log("Delete old image error:", e.message);

      }

      // update existing row
      existingImage.image = finalImagePath;
      existingImage.language = language;

      await existingImage.save();

      results.push(existingImage);

    }

    // ==================================================
    // CREATE NEW IMAGE
    // ==================================================

    else {

      // check max limit
      const totalImages = await DealerImage.count({
        where: { dealer_id },
      });

      if (totalImages >= 4) {
        throw new Error("Maximum 4 images allowed");
      }

      const created = await DealerImage.create({
        dealer_id,
        language,
        image: finalImagePath,
      });

      results.push(created);

    }

  }

  return results;
};


// import fs from "fs";

// import Dealer from "../../Model/dealerModel.js";
// import DealerImage from "../../Model/dealer/DealerImage.js";
// import { generateBanner } from "./generateBanner.js";

// export const processDealerBannerPipeline = async ({
//   files,
//   dealer_id,
//   language,
//   image_ids
// }) => {

//   // ─────────────────────────────
//   // DEALER VALIDATION
//   // ─────────────────────────────

//   const dealer = await Dealer.findOne({
//     where: { id: dealer_id },
//     attributes: ["id"],
//   });

//   if (!dealer) {
//     throw new Error("Dealer not found");
//   }

//   // ─────────────────────────────
//   // VALIDATIONS
//   // ─────────────────────────────

//   if (!files || files.length === 0) {
//     throw new Error("Images required");
//   }

//   if (files.length > 4) {
//     throw new Error("Only 4 images allowed");
//   }

//   // ─────────────────────────────
//   // DELETE OLD IMAGES OF SAME LANGUAGE
//   // ─────────────────────────────

//   const oldImages = await DealerImage.findAll({
//     where: {
//       dealer_id,
//       language,
//     },
//   });

//   for (const old of oldImages) {

//     try {

//       const filePath = `.${old.image}`;

//       if (fs.existsSync(filePath)) {
//         fs.unlinkSync(filePath);
//       }

//     } catch (e) {

//       console.log("Delete image error:", e.message);

//     }
//   }

//   await DealerImage.destroy({
//     where: {
//       dealer_id,
//       language,
//     },
//   });

//   // ─────────────────────────────
//   // GENERATE NEW IMAGES
//   // ─────────────────────────────

//   const results = [];

//   for (const file of files) {

//     const finalImagePath = await generateBanner({
//       personBuffer: file.buffer,
//       language,
//       originalName: file.originalname,
//     });

//     const created = await DealerImage.create({
//       dealer_id,
//       language,
//       image: finalImagePath,
//     });

//     results.push(created);
//   }
  
//   return results;
// };