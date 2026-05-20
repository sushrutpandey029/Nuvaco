import sharp from "sharp";

export const enhanceImage = async (buffer) => {
  return await sharp(buffer)
    .modulate({ brightness: 1.1, saturation: 1.2 })
    .sharpen()
    .toBuffer();
};
