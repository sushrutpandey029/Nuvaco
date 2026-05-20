// middleware/videoUpload.js
import multer from "multer";
import path from "path";
import fs from "fs";

// Create folder if not exists
const uploadPath = "uploads/videos";

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const Videoupload = multer({
  storage,

  limits: {
    fileSize: 500 * 1024 * 1024, // 50MB
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "video/mp4",
      "video/mkv",
      "video/avi",
      "video/mov",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only video files allowed"));
    }
  },
});

export default Videoupload;