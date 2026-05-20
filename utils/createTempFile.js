import fs from "fs";
import path from "path";

export const createTempFile = async (
  buffer,
  fileName
) => {

  const tempDir = path.join(process.cwd(), "temp");

  // create temp folder
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const filePath = path.join(tempDir, fileName);

  fs.writeFileSync(filePath, buffer);

  return filePath;
};