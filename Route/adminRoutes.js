import express from "express";

import {
  AdminRegister,
  adminloginview,
  adminlogin,
  adminDashboard,
  registerDealer,
  uploadDealersExcel,
  adminLogout,
} from "../Controller/AdminController/Admin.js";
import dealerUpload from "../middlewares/dealerUpload.js";
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

export default adminrouter;
