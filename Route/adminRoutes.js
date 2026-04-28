import express from "express"

import {AdminRegister,adminloginview,adminlogin,registerDealer} from "../Controller/AdminController/Admin.js"

const adminrouter = express.Router();

adminrouter.get("/",adminloginview);
adminrouter.post("/adminsigup",AdminRegister);
adminrouter.post("/adminsigin",adminlogin);

// dealer Registration routes
adminrouter.post("/regi-delars",registerDealer);

export default adminrouter;