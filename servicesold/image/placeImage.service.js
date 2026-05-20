import sharp from "sharp";

export const placeImageOnTemplate = async ({
  templatePath,
  personBuffer,
  top,
  left,
  width,
}) => {
  // Main person
  // const resizedPerson = await sharp(personBuffer)
  //   .resize({ width })
  //   .sharpen()
  //   .png()
  //   .toBuffer();
  const resizedPerson = await sharp(personBuffer)
    .resize({ width })

    // enhance brightness
    .modulate({
      brightness: 1.08,
      saturation: 1.05,
    })

    // enhance contrast
    .linear(1.05, 0)

    // professional light correction
    .gamma(1.1)

    // improve sharpness
    .sharpen({
      sigma: 1.2,
    })

    .png()
    .toBuffer();
  // Very soft shadow
  const shadow = await sharp(personBuffer)
    .resize({ width })
    .blur(2)
    .modulate({
      brightness: 0.85,
    })
    .png()
    .toBuffer();

  return await sharp(templatePath)
    .composite([
      {
        input: shadow,

        // small offset
        top: top + 3,
        left: left + 3,

        blend: "multiply",

        // very low visibility
        opacity: 0.08,
      },

      {
        input: resizedPerson,
        top,
        left,
        blend: "over",
      },
    ])
    .png()
    .toBuffer();
};

// import sharp from "sharp";

// export const placeImageOnTemplate = async ({
//   templatePath,
//   personBuffer,
//   top,
//   left,
//   width,
// }) => {

//   // main person
//   const resizedPerson = await sharp(personBuffer)
//     .resize({ width })
//     .sharpen()
//     .png()
//     .toBuffer();

//   // shadow
//   // const shadow = await sharp(personBuffer)
//   //   .resize({ width })
//   //   .blur(12)
//   //   .modulate({
//   //     brightness: 0.2,
//   //   })
//   //   .png()
//   //   .toBuffer();

//   const shadow = await sharp(personBuffer)
//   .resize({ width })
//   .blur(5)
//   .modulate({
//     brightness: 0.6,
//   })
//   .png()
//   .toBuffer();

//   return await sharp(templatePath)
//     .composite([
//       {
//         input: shadow,
//         top: top + 12,
//         left: left + 12,
//         blend: "multiply",
//         opacity: 0.18,
//       },

//       {
//         input: resizedPerson,
//         top,
//         left,
//         blend: "over",
//       },
//     ])
//     .png()
//     .toBuffer();
// };

// import sharp from "sharp";

// export const placeImageOnTemplate = async ({
//   templatePath,
//   personBuffer,
//   top,
//   left,
//   width,
// }) => {
//   // resize person image
//   const resizedPerson = await sharp(personBuffer)
//     .resize({ width })
//     .png()
//     .toBuffer();

//   // place on template
//   return await sharp(templatePath)
//     .composite([
//       {
//         input: resizedPerson,
//         gravity: "center",
//       },
//     ])
//     .jpeg({ quality: 90 })
//     .toBuffer();
// };
