import sharp from "sharp";

export const enhanceBanner = async (buffer) => {
  return await sharp(buffer)
    .modulate({
      brightness: 1.06,
      saturation: 1.15,
    })

    .sharpen({
      sigma: 1.5,
      m1: 1,
      m2: 3,
    })

    .jpeg({
      quality: 100,
      mozjpeg: true,
    })

    .toBuffer();
};
