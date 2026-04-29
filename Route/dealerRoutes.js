import express from "express";
import {
  renderHome,
  sendOTP,
  verifyOTP,
  renderUploadPic,
  renderFinalPic,
  renderThankyouPage,
  logout,
  renderLogin
} from "../Controller/DealerController/Dealer.js";

const dealerrouter = express.Router();

dealerrouter.get("/", renderHome);
dealerrouter.get("/login", renderLogin);
dealerrouter.post("/send-otp", sendOTP);
dealerrouter.post("/verify-otp", verifyOTP);
dealerrouter.get("/logout", logout);

dealerrouter.get("/upload-pic", renderUploadPic);
dealerrouter.get("/final-pic", renderFinalPic);
dealerrouter.get("/thankyou", renderThankyouPage);

export default dealerrouter;
