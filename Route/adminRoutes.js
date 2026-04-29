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
  adminProfile,dealerList,dealerDetail,dealerRegister,videoMessage
} from "../Controller/AdminController/Admin.js";
import dealerUpload from "../middlewares/dealerUpload.js";
import {upload} from "../middlewares/shopimageupload.js";

const adminrouter = express.Router();

adminrouter.post("/adminsigup", AdminRegister);
adminrouter.get("/login", adminloginview);
adminrouter.post("/adminsignin", adminlogin);
adminrouter.get("/dashboard", adminDashboard);

adminrouter.get("/adminprofile",adminProfile);
adminrouter.get("/dealerlist",dealerList);
adminrouter.get("/dealerdetail",dealerDetail);
adminrouter.get("/dealerregister",dealerRegister);
adminrouter.get("/videomessage",videoMessage);

// adminrouter.post("/registration-delars", registerDealer);

adminrouter.post(
  "/upload-dealers",
  dealerUpload.single("file"),
  uploadDealersExcel,
);

adminrouter.post("/adminlogout", adminLogout);
adminrouter.post("/change-password", adminChangePassword);

adminrouter.post("/registration-delars", upload.single("shop_image"), registerDealer);

export default adminrouter;




















