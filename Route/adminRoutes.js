import express from "express"

import {AdminRegister,adminloginview,adminlogin} from "../Controller/AdminController/Admin.js"

const adminrouter = express.Router();

adminrouter.get("/",adminloginview);
adminrouter.post("/adminsigup",AdminRegister);
adminrouter.post("/adminsigin",adminlogin);

export default adminrouter;