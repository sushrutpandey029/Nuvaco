import express from "express";

import {
  AdminRegister,
  adminloginview,
  adminlogin,
  adminDashboard,
  registerDealer,
  uploadDealersExcel,
  adminLogout,
  adminChangePassword,
  adminProfile,
  dealerList,
  dealerDetail,
  dealerRegister,
  videoMessage,
  uploadRegionVideo,
} from "../Controller/AdminController/Admin.js";
import dealerUpload from "../middlewares/dealerUpload.js";
import { upload } from "../middlewares/shopimageupload.js";
import Videoupload from "../middlewares/videoUpload.js";

const adminrouter = express.Router();

adminrouter.post("/adminsigup", AdminRegister);
adminrouter.get("/login", adminloginview);
adminrouter.post("/adminsignin", adminlogin);
adminrouter.get("/dashboard", adminDashboard);

adminrouter.get("/adminprofile", adminProfile);
adminrouter.get("/dealerlist", dealerList);
adminrouter.get("/dealerdetail", dealerDetail);
adminrouter.get("/dealerregister", dealerRegister);
adminrouter.get("/videomessage", videoMessage);
 adminrouter.post(
  "/upload-region-video",
  Videoupload.single("file"),
  uploadRegionVideo,
);

adminrouter.post(
  "/upload-dealers",
  dealerUpload.single("file"),
  uploadDealersExcel,
);
adminrouter.get("/adminlogout", adminLogout);
adminrouter.post("/change-password", adminChangePassword);
adminrouter.post(
  "/registration-delars",
  upload.single("shop_image"),
  registerDealer,
);

export default adminrouter;
