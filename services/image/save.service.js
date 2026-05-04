import fs from "fs";
import path from "path";

export const saveImage = async (buffer) => {
  const fileName = `dealer-${Date.now()}.png`;
  const filePath = path.join("uploads/dealers", fileName);

  fs.writeFileSync(filePath, buffer);

  return `/uploads/dealers/${fileName}`;
};