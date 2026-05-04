import sharp from "sharp";

export const addOverlay = async (buffer) => {
  return await sharp(buffer)
    .composite([
      {
        input: "assets/logo.png",
        gravity: "southeast",
      },
    ])
    .toBuffer();
};