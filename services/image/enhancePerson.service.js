import sharp from "sharp";

export const enhancePersonImage = async (buffer) => {
  return await sharp(buffer)
    // upscale heavily FIRST
    .resize({
      width: 2200,

      fit: "inside",

      kernel: sharp.kernel.lanczos3,

      withoutEnlargement: false,
    })

    // normalize tones
    .normalise()

    // sharpen details
    .sharpen({
      sigma: 1.8,
      m1: 1,
      m2: 3,
    })

    // subtle improvements
    .modulate({
      brightness: 1.03,
      saturation: 1.04,
    })

    .png()

    .toBuffer();
};
