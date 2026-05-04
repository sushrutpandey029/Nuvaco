// // middleware/imageUpload.js
import multer from "multer";
import path from "path";
import fs from "fs";

const imagesupload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files allowed"));
    }
  },
});

export default imagesupload;


// import multer from "multer";
// import path from "path";
// import fs from "fs";

// const uploadPath = "uploads/dealers";

// if (!fs.existsSync(uploadPath)) {
//   fs.mkdirSync(uploadPath, { recursive: true });
// }

// const storage = multer.memoryStorage({
//   destination: (req, file, cb) => {
//     cb(null, uploadPath);
//   },

//   filename: (req, file, cb) => {
//     const uniqueName = Date.now() + "-" + file.originalname;

//     cb(null, uniqueName);
//   },
// });

// const imagesupload = multer({
//   storage,

//   limits: {
//     fileSize: 5 * 1024 * 1024,
//   },

//   fileFilter: (req, file, cb) => {
//     const allowed = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

//     if (allowed.includes(file.mimetype)) {
//       cb(null, true);
//     } else {
//       cb(new Error("Only image files allowed"));
//     }
//   },
// });

// export default imagesupload;
