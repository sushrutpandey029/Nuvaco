import express from "express";
import dealerUpload from "../middlewares/dealerUpload.js";
import Videoupload from "../middlewares/videoUpload.js";
import {
  AdminRegister,
  adminloginview,
  adminlogin,
  adminDashboard,
  registerDealer,
  uploadDealersExcel,
  adminLogout,
  uploadRegionVideo
} from "../Controller/AdminController/Admin.js";

const adminrouter = express.Router();

adminrouter.post("/adminsigup", AdminRegister);
adminrouter.get("/login", adminloginview);
adminrouter.post("/adminsignin", adminlogin);
adminrouter.get("/dashboard", adminDashboard);
adminrouter.post("/regi-delars", registerDealer);
adminrouter.post(
  "/upload-dealers",
  dealerUpload.single("file"),
  uploadDealersExcel,
);
adminrouter.post("/adminlogout", adminLogout);

adminrouter.post(
  "/upload-region-video",
  Videoupload.single("video"),
  uploadRegionVideo
);

export default adminrouter;
