import express from "express";
import { renderHome,sendOTP, verifyOTP} from "../Controller/DealerController/Dealer.js";

const dealerrouter = express.Router();

dealerrouter.get("/", renderHome);
dealerrouter.post("/send-otp", sendOTP);
dealerrouter.post("/verify-otp", verifyOTP);


export default dealerrouter;