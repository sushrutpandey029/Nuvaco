import express from "express";
import {
  renderHome,
  sendOTP,
  verifyOTP,
  renderUploadPic,
  renderFinalPic,
  renderThankyouPage,
  logout,
  renderLogin,
  uploadDealerImages,
  saveFinalImage,
  getDealerProfile,
} from "../Controller/DealerController/Dealer.js";
import imagesupload from "../middlewares/imageUpload.js";
import {
  deleteDealer,
  updateDealer,
} from "../Controller/AdminController/Admin.js";
import { isDealerLoggedIn } from "../middlewares/auth/isDealerLoggedIn.js";
const dealerrouter = express.Router();

// dealerrouter.use(isDealerLoggedIn);

dealerrouter.get("/", renderHome);
dealerrouter.get("/login", renderLogin);
dealerrouter.post("/send-otp", sendOTP);
dealerrouter.post("/verify-otp", verifyOTP);
dealerrouter.get("/logout", logout);

dealerrouter.get("/upload-pic", renderUploadPic);
dealerrouter.get("/final-pic", renderFinalPic);
dealerrouter.get("/thankyou", renderThankyouPage);

dealerrouter.post(
  "/upload-dealer-images",
  imagesupload.array("images", 4),
  uploadDealerImages,
);
dealerrouter.post("/save-final-image", saveFinalImage);
dealerrouter.get("/profile/:id", getDealerProfile);

export default dealerrouter;
