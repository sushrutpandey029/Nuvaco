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
  getDealerDetails,
  getDealerImages,
  getRegionVideoList,
  editStateVideo,
  deleteRegionVideo,
  renderEditStateMessage,
  downloadDealerExcel,
  renderEditDealer,
  updateDealer,
  deleteDealer,
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
adminrouter.get("/add-state-message", videoMessage);
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

adminrouter.get("/dealerlist", dealerList);
adminrouter.get("/dealerdetail/:id", getDealerDetails);
adminrouter.get("/dealer-image/:id", getDealerImages);

adminrouter.get("/state-message-list", getRegionVideoList);

adminrouter.get("/edit-state-message/:id", renderEditStateMessage);
adminrouter.post(
  "/edit-state-message/:id",
  Videoupload.single("file"),
  editStateVideo,
);

adminrouter.post("/delete-state-message/:id", deleteRegionVideo);
adminrouter.get("/download-dealer-excel", downloadDealerExcel);

adminrouter.post(
  "/upload-dealers",
  dealerUpload.single("file"),
  uploadDealersExcel,
);

adminrouter.get("/editdealer/:id", renderEditDealer);

adminrouter.post("/update-dealer/:id", updateDealer);

adminrouter.get("/delete-dealer/:id", deleteDealer);

export default adminrouter;
