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
  saveFinalImage
} from "../Controller/DealerController/Dealer.js";
import imagesupload from "../middlewares/imageUpload.js";

const dealerrouter = express.Router();

dealerrouter.get("/", renderHome);
dealerrouter.get("/login", renderLogin);
dealerrouter.post("/send-otp", sendOTP);
dealerrouter.post("/verify-otp", verifyOTP);
dealerrouter.get("/logout", logout);

dealerrouter.get("/upload-pic", renderUploadPic);
dealerrouter.get("/final-pic", renderFinalPic);
dealerrouter.get("/thankyou", renderThankyouPage);

dealerrouter.post("/upload-dealer-images",imagesupload.array("images", 4), uploadDealerImages);
dealerrouter.post("/save-final-image", saveFinalImage);
export default dealerrouter;
