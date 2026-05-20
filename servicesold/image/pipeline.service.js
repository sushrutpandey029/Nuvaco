import fs from "fs";
import path from "path";

import Dealer from "../../Model/dealerModel.js";
import DealerImage from "../../Model/dealer/DealerImage.js";

import { removeBackground } from "./removeBg.service.js";
import { enhanceImage } from "./enhance.service.js";
import { saveImage } from "./save.service.js";

import { templates } from "./template.config.js";
import { placeImageOnTemplate } from "./placeImage.service.js";
import { enhanceWithGemini } from "./enhanceWithGemini.js";

export const processImagesPipeline = async ({ files, dealer_id, language }) => {
  // ✅ Dealer validation
  const dealer = await Dealer.findOne({
    where: { id: dealer_id },
    attributes: ["id"],
  });

  if (!dealer) {
    throw new Error("Dealer not found");
  }

  // ✅ validations
  if (!files || files.length === 0) {
    throw new Error("Images required");
  }

  if (files.length > 4) {
    throw new Error("Only 4 images allowed");
  }

  // ✅ DELETE OLD GENERATED IMAGES
  const oldImages = await DealerImage.findAll({
    where: { dealer_id },
  });

  for (const old of oldImages) {
    try {
      const filePath = `.${old.image}`;

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.log("delete error", e.message);
    }
  }

  await DealerImage.destroy({
    where: { dealer_id },
  });

  const results = [];

  // ✅ LOOP USER IMAGES
  for (const file of files) {
    // 🔥 STEP 1 → remove bg
    const bgRemoved = await removeBackground(file.buffer);

    // 🔥 STEP 2 → enhance
    const enhanced = await enhanceImage(bgRemoved);

    // 🔥 STEP 3 → loop templates
    for (const template of templates) {
      // 🔥 place person inside template
      const finalImageBuffer = await placeImageOnTemplate({
        templatePath: template.image,

        personBuffer: enhanced,

        top: template.placement.top,
        left: template.placement.left,
        width: template.placement.width,
      });

      //for image enhancement
      //    const tempDir = path.join(process.cwd(), "temp");

      // // create temp folder if not exists
      // if (!fs.existsSync(tempDir)) {
      //   fs.mkdirSync(tempDir, { recursive: true });
      // }

      // const tempPath = path.join(tempDir, "final.png");

      // fs.writeFileSync(tempPath, finalImageBuffer);
      // console.log("before gmini")
      // const enhancedBuffer =
      //   await enhanceWithGemini(tempPath);

      // 🔥 save final image
      const imagePath = await saveImage(finalImageBuffer);
      // const imagePath = await saveImage(enhancedBuffer);

      // 🔥 DB save
      const created = await DealerImage.create({
        dealer_id,
        language,
        image: imagePath,
      });

      results.push(created);
    }
  }
  console.log("before result");

  return results;
};
