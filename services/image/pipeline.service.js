// services/image/pipeline.service.js
import { removeBackground } from "./removeBg.service.js";
// import { enhanceImage } from "./enhance.service.js";
// import { addOverlay } from "./overlay.service.js";
import { saveImage } from "./save.service.js";
import DealerImage from "../../Model/dealer/DealerImage.js";

export const processImagesPipeline = async ({ files, dealer_id, language }) => {
  const results = await Promise.all(
    files.map(async (file) => {
      // Step 1: Remove BG
      const bgRemoved = await removeBackground(file.buffer);
      console.log("bgRemoved", bgRemoved);
      // Step 2: Enhance
      //   const enhanced = await enhanceImage(bgRemoved);

      // Step 3: Overlay
      //   const finalImage = await addOverlay(enhanced);

      // Step 4: Save
      //   const imagePath = await saveImage(finalImage);
      const imagePath = await saveImage(bgRemoved);

      // Step 5: DB Save
      return await DealerImage.create({
        dealer_id,
        language,
        image: imagePath,
      });
    }),
  );

  return results;
};
