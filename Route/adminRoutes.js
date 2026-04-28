import express from "express";
import upload from "../Middleware/upload.js";

import {AdminRegister,adminloginview,adminlogin,registerDealer, uploadDealersExcel, getDealers} from "../Controller/AdminController/Admin.js"


const adminrouter = express.Router();

adminrouter.post("/adminsigup",AdminRegister);
adminrouter.get("/",adminloginview);
adminrouter.post("/adminsigin",adminlogin);

// dealer Registration routes

adminrouter.post("/regi-delars",registerDealer);

adminrouter.post(
  "/upload-dealers",
  upload.single("file"),
  uploadDealersExcel
);

adminrouter.get("/get-dealers", getDealers);

export default adminrouter;