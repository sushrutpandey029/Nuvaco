import express from "express"

import {AdminRegister,adminloginview,adminlogin,adminDashboard} from "../Controller/AdminController/Admin.js"

const adminrouter = express.Router();

adminrouter.post("/adminsigup",AdminRegister);
adminrouter.get("/login",adminloginview);
adminrouter.post("/adminsignin",adminlogin);
adminrouter.get("/dashboard",adminDashboard);


export default adminrouter;