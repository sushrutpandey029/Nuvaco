import sharp from "sharp";

export const enhanceBanner = async (buffer) => {
  return await sharp(buffer)
    .modulate({
      brightness: 1.04,
      saturation: 1.12,
    })
    .sharpen({
      sigma: 1.2,
      m1: 1,
      m2: 2,
    })
    .jpeg({
      quality: 97,
      mozjpeg: true,
    })
    .toBuffer();
};