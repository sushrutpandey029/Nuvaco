import fs from "fs";

import Dealer from "../../Model/dealerModel.js";
import DealerImage from "../../Model/dealer/DealerImage.js";
import { generateBanner } from "./generateBanner.js";

export const processDealerBannerPipeline = async ({
  files,
  dealer_id,
  language,
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
  // DELETE OLD IMAGES OF SAME LANGUAGE
  // ─────────────────────────────

  const oldImages = await DealerImage.findAll({
    where: {
      dealer_id,
      language,
    },
  });

  for (const old of oldImages) {

    try {

      const filePath = `.${old.image}`;

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

    } catch (e) {

      console.log("Delete image error:", e.message);

    }
  }

  await DealerImage.destroy({
    where: {
      dealer_id,
      language,
    },
  });

  // ─────────────────────────────
  // GENERATE NEW IMAGES
  // ─────────────────────────────

  const results = [];

  for (const file of files) {

    const finalImagePath = await generateBanner({
      personBuffer: file.buffer,
      language,
      originalName: file.originalname,
    });

    const created = await DealerImage.create({
      dealer_id,
      language,
      image: finalImagePath,
    });

    results.push(created);
  }

  return results;
};