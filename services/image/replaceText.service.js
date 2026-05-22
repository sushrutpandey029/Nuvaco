import sharp from "sharp";

/**
 * Replace banner tagline while preserving
 * original style/layout as much as possible.
 */
export const replaceBannerText = async ({ imageBuffer, translatedText }) => {
  const meta = await sharp(imageBuffer).metadata();

  const IW = meta.width;
  const IH = meta.height;

  // SCALE
  const scaleX = IW / 3456;
  const scaleY = IH / 5184;

  // ORIGINAL TEXT AREA
  const coverX = Math.round(220 * scaleX);
  const coverY = Math.round(700 * scaleY);

  // SMALLER COVER
  const coverW = Math.round(3000 * scaleX);
  const coverH = Math.round(620 * scaleY);

  // ORIGINAL FONT SIZE APPROX
  const fontSize = Math.round(92 * scaleX);

  // ORIGINAL STYLE
  const lineHeight = Math.round(fontSize * 1.15);

  // MANUAL 2-LINE BREAK
  const lines = splitIntoTwoLines(translatedText);

  // TEXT START POSITION
  const textX = Math.round(IW / 2);
  const textY = Math.round(930 * scaleY);

  const tspans = lines
    .map((line, index) => {
      return `
<tspan
  x="${textX}"
  y="${textY + index * lineHeight}"
>
${escapeXml(line)}
</tspan>`;
    })
    .join("");

  // SMALL BLUE COVER
  const coverSvg = `
<svg width="${IW}" height="${IH}">
  <rect
    x="${coverX}"
    y="${coverY}"
    width="${coverW}"
    height="${coverH}"
    fill="#3d4fb7"
  />
</svg>
`;

  // TEXT SVG
  const textSvg = `
<svg width="${IW}" height="${IH}">
  <style>
    .title {
      fill: white;
      font-size: ${fontSize}px;
      font-weight: 700;

      font-family:
        "Noto Sans",
        "Noto Sans Devanagari",
        "Noto Sans Gujarati",
        "Noto Sans Bengali",
        sans-serif;
    }
  </style>

  <text
    text-anchor="middle"
    class="title"
  >
    ${tspans}
  </text>
</svg>
`;

  return await sharp(imageBuffer)
    .composite([
      {
        input: Buffer.from(coverSvg),
      },

      {
        input: Buffer.from(textSvg),
      },
    ])
    .png()
    .toBuffer();
};

/**
 * Split text into balanced 2 lines
 */
function splitIntoTwoLines(text) {
  const words = text.split(" ");

  const mid = Math.ceil(words.length / 2);

  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
