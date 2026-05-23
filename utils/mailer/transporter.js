import nodemailer from "nodemailer";
import { mailConfig } from "../../config/mail.config.js";

export const transporter = nodemailer.createTransport({
  host: mailConfig.host,
  port: mailConfig.port,
  secure: mailConfig.secure,
  auth: mailConfig.auth,
});
