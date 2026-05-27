import axios from "axios";
import Dealer from "../../Model/dealerModel.js";
import DealerOTP from "../../Model/dealer/dealerOtp.js";
import MessageModel from "../../Model/dealer/MessageModel.js";
import DealerImage from "../../Model/dealer/DealerImage.js";

import fs from "fs";

import DealerFinalImage from "../../Model/dealer/DealerFinalImage.js";
// import { processImagesPipeline } from "../../services/image/pipeline.service.js";
import RegionVideo from "../../Model/regionVideoModel.js";

import { formatImageArray } from "../../utils/formatImagePath.js";

import SalesSpoc from "../../Model/salesSpocModel.js";

import TradeMarketingSpoc from "../../Model/tradeMarketingSpocModel.js";

import path from "path"

import { generateBanner } from "../../services/pipeline/generateBannerold.js";

import {
  getPersonalizedVideo,
  getVideoStatus,
} from "../../services/video/videoPipeline.js";

import { processDealerBannerPipeline } from "../../services/pipeline/processDealerBannerPipeline.service.js";

import { sendMail } from "../../utils/mailer/index.js";

import AdminModel from "../../Model/adminModel.js";
import { sendApprovedImageSms } from "../../utils/sms/sendApprovedImageSms.js";

export const renderLogin = async (req, res) => {
  const dealer = req.session.dealer;
  if (dealer) {
    return res.redirect("/");
  }
  return res.render("dealer/auth/dealerLogin", {
    error: req.flash("error")[0] || null,
    success: req.flash("success")[0] || null,
  });
};

export const renderHome = async (req, res) => {
  const dealer = req.session.dealer;

  if (!dealer) {
    return res.redirect("/login");
  }
  console.log("dealer in home page", dealer);

  const data = await RegionVideo.findOne({
    where: { state: dealer.state },
    order: [["createdAt", "DESC"]],
    raw: true,
  });

  console.log("region video data", data);

  const formatted = data
    ? { ...data, video: data.video.replace(/\\/g, "/") }
    : null;

  const videoPath = await getPersonalizedVideo(dealer);
  console.log("video path", videoPath);

  return res.render("dealer/welcome-screen", {
    data: formatted,
    dealer,
    videoPath: videoPath || null,
  });
};

export const videoStatus = async (req, res) => {
  const dealer = req.session.dealer;
  if (!dealer) return res.status(401).json({ error: "Unauthorized" });
  const status = await getVideoStatus(dealer.id);
  return res.json(status);
};

export const sendSmsOtp = async (dealer_mobile_number, otp) => {
  try {
    console.log("in send sms otp", dealer_mobile_number, otp);
    // const message = `Welcome to Nuvoco Super Women Sangini! Your OTP is ${otp}. STRMCM`;
    const message = `Hi, Thank you for joining the Mera Bharosa Campaign! Your OTP for registration is ${otp}. This OTP is valid for 10 minutes. Please do not share it with anyone. STRMCM`;

    const params = {
      APIKey: process.env.SMS_API_KEY,
      senderid: process.env.SMS_SENDER_ID,
      channel: "Trans",
      DCS: 0,
      flashsms: 0,
      number: "91" + dealer_mobile_number,
      text: message,
      DLTTemplateId: process.env.SMS_TEMPLATE_ID,
      route: 0,
      PEId: process.env.SMS_PE_ID,
    };

    const response = await axios.get(process.env.SMS_BASE_URL, { params });
    console.log("resp of sns otp", response.data);
    return response.data ? true : false;
  } catch (error) {
    console.log("SMS Error:", error.message);
    return false;
  }
};

export const sendOTP = async (req, res) => {
  try {
    console.log("send otp called");
    const { dealer_mobile_number } = req.body;

    if (!dealer_mobile_number) {
      return res.json({ success: false, message: "Contact required" }); // ✅ JSON, not redirect
    }
    console.log("deae mob no", dealer_mobile_number);
    const dealer = await Dealer.findOne({ where: { dealer_mobile_number } });

    if (!dealer) {
      return res.json({ success: false, message: "Dealer not found" }); // ✅ JSON, not redirect
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await DealerOTP.destroy({ where: { dealer_mobile_number } });
    await DealerOTP.create({ dealer_mobile_number, otp, expiresAt });
    console.log("before sndnsmsotp");
    const smsSent = await sendSmsOtp(dealer_mobile_number, otp);
    console.log("after send sms");
    if (!smsSent) {
      return res.json({ success: false, message: "Failed to send OTP" }); // ✅ JSON, not redirect
    }

    return res.json({ success: true });
  } catch (err) {
    console.log(err);
    return res.json({ success: false, message: "Something went wrong" }); // ✅ JSON, not redirect
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { dealer_mobile_number, otp } = req.body;

    if (!dealer_mobile_number || !otp) {
      // ✅ Return JSON so JS can show error inline (OTP field stays visible)
      return res.json({ success: false, message: "All fields required" });
    }

    const otpRecord = await DealerOTP.findOne({
      where: { dealer_mobile_number, otp },
    });

    if (!otpRecord) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    if (new Date() > otpRecord.expiresAt) {
      await DealerOTP.destroy({ where: { dealer_mobile_number } });
      return res.json({
        success: false,
        message: "OTP expired. Please request a new one",
      });
    }

    const dealer = await Dealer.findOne({ where: { dealer_mobile_number } });

    if (!dealer) {
      return res.json({ success: false, message: "Dealer not found" });
    }

    req.session.dealer = {
      id: dealer.id,
      name: dealer.dealer_person,
      dealer_mobile_number: dealer.dealer_mobile_number,
      state: dealer.state,
    };

    await DealerOTP.destroy({ where: { dealer_mobile_number } });

    // ✅ Return JSON with redirect URL — JS will follow it
    return res.json({ success: true, redirect: "/" });
  } catch (err) {
    console.log(err);
    return res.json({ success: false, message: "Something went wrong" });
  }
};

export const resendOTP = async (req, res) => {
  try {
    console.log("========== RESEND OTP ==========");

    const { dealer_mobile_number } = req.body;

    // ✅ Validate mobile number
    if (!dealer_mobile_number || !/^[0-9]{10}$/.test(dealer_mobile_number)) {
      return res.json({
        success: false,
        message: "Invalid mobile number",
      });
    }

    // ✅ Check dealer exists
    const dealer = await Dealer.findOne({
      where: { dealer_mobile_number },
    });

    if (!dealer) {
      return res.json({
        success: false,
        message: "Dealer not found",
      });
    }

    // ✅ Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    console.log("NEW OTP:", otp);

    // ✅ Expiry time
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // ✅ Delete old OTP
    await DealerOTP.destroy({
      where: { dealer_mobile_number },
    });

    // ✅ Save new OTP
    await DealerOTP.create({
      dealer_mobile_number,
      otp,
      expiresAt,
    });

    // ✅ Send SMS
    const smsSent = await sendSmsOtp(dealer_mobile_number, otp);

    if (!smsSent) {
      return res.json({
        success: false,
        message: "Failed to send OTP",
      });
    }

    return res.json({
      success: true,
      message: "OTP resent successfully",
    });
  } catch (err) {
    console.log("RESEND OTP ERROR =>", err);

    return res.json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Logout failed");
    }

    res.clearCookie("connect.sid");
    return res.redirect("/login");
  });
};

export const renderUploadPic = async (req, res) => {
  const dealer_id = req.session.dealer.id;
  const imageData = await DealerImage.findAll({
    where: { dealer_id },
    attributes: ["id", "image", "language"],
    raw: true,
  });

  // Dealer Data
  const dealerData = await Dealer.findOne({
    where: { id: dealer_id },
    attributes: ["id", "imageStatus"],
    raw: true,
  });
  console.log("dealer data", dealerData);
  const formatted = imageData.map((img) => ({
    ...img,
    image: img.image.replace(/\\/g, "/"),
  }));

  const templatesDir = path.join(process.cwd(), "public/frontendTemp");

  const files = fs.readdirSync(templatesDir);

  const templates = files.map((file, index) => ({
    id: index + 1,
    name: path.parse(file).name,
    image: `/frontendTemp/${file}`,
  }));

  console.log("frontendTemp", templates);
  // const templatesDir = path.join(process.cwd(), "public/templates");

  // const files = fs.readdirSync(templatesDir);

  // const templates = files.map((file, index) => ({
  //   id: index + 1,
  //   name: path.parse(file).name,
  //   image: `/templates/${file}`,
  // }));

  // console.log("templates", templates);

  return res.render("dealer/upload-pic", {
    images: formatted,
    templates,
    imageStatus: dealerData?.imageStatus,
  });
};

export const renderFinalPic = async (req, res) => {
  try {
    const dealer_id = req.session.dealer.id;

    const images = await DealerImage.findAll({
      where: { dealer_id },
      attributes: ["id", "image", "language"],
      raw: true,
    });

    console.log("image data in final", images);

    const formatted = images.map((img) => ({
      ...img,
      image: img.image.replace(/\\/g, "/"),
    }));

    return res.render("dealer/final-pic", { images: formatted });
  } catch (error) {
    console.log("renderFinalPic Error:", error);
    return res.status(500).send("Something went wrong.");
  }
};

export const renderThankyouPage = async (req, res) => {
  return res.render("dealer/thankyou");
};

export const uploadDealerImages = async (req, res) => {
  try {
    const { dealer_id, language } = req.body;

    const image_ids = JSON.parse(req.body.image_ids || "[]");

    const allowedLanguages = [
      "HINDI",
      "GUJARATI",
      "BENGALI",
      "PUNJABI",
      "ENGLISH",
      "ODIA",
      "ASSAMESE",
    ];

    // =========================
    // VALIDATIONS
    // =========================

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Images required",
      });
    }

    if (!allowedLanguages.includes(language?.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid language",
      });
    }

    // =========================
    // FIND DEALER
    // =========================

    const dealer = await Dealer.findOne({
      where: { id: dealer_id },
    });

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer not found",
      });
    }

    // =========================
    // PROCESS IMAGES
    // =========================

    const results = await processDealerBannerPipeline({
      files: req.files,
      dealer_id,
      language,
      image_ids,
    });

    // =========================
    // UPDATE DEALER
    // =========================

    await Dealer.update(
      {
        isImageUploaded: "yes",
        imageStatus: "pending",
      },
      {
        where: { id: dealer_id },
      },
    );

    // =========================
    // TOTAL IMAGES
    // =========================

    const totalImages = await DealerImage.count({
      where: { dealer_id },
    });

    // =========================
    // SEND MAIL TO ADMIN
    // =========================

    try {

        //send sms to daler
    const resp = await sendApprovedImageSms(dealer.dealer_mobile_number);
    console.log("resp of send approved sms", resp);

      // =========================
      // GET ALL ADMINS
      // =========================

      const admins = await AdminModel.findAll({
        where: { role: "ADMIN" },
        attributes: ["email"],
      });

      // extract emails
      const adminEmails = admins.map((admin) => admin.email).filter(Boolean);

      // =========================
      // SEND MAIL TO ALL ADMINS
      // =========================

      if (adminEmails.length > 0) {
        await sendMail({
          to: adminEmails.join(","),

          subject: "Dealer Images Uploaded – Nuvoco",

          template: "admin/dealerImageUploaded",

          context: {
            dealerId: dealer.id,

            dealerCode: dealer.dealer_code,

            shopName: dealer.shop_name,

            dealerPerson: dealer.dealer_person,

            mobile: dealer.dealer_mobile_number,

            state: dealer.state,

            district: dealer.district,

            address: dealer.address,

            pincode: dealer.pincode,

            language,

            totalImages,
            adminPanelUrl:
              process.env.ADMIN_PANEL_URL,
          },
        });
      }
    } catch (mailError) {
      console.log("Mail send error:", mailError.message);
    }

    // =========================
    // RESPONSE
    // =========================

    return res.json({
      success: true,
      message: "Images processed successfully",
      data: results,
    });
  } catch (error) {
    console.log("Controller Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getDealerProfile = async (req, res) => {
  try {
    console.log(":dealer profile");
    const dealerId = Number(req.params.id);

    // VALIDATE ID
    if (!dealerId) {
      req.flash("error", "Invalid dealer id");

      return res.redirect("/admin/dealerlist");
    }

    // FIND DEALER
    const dealer = await Dealer.findByPk(dealerId, {
      include: [
        {
          model: SalesSpoc,
          required: false,
        },

        {
          model: TradeMarketingSpoc,
          required: false,
        },
      ],
    });
    console.log("dealer data", dealer);

    // CHECK DEALER
    if (!dealer) {
      req.flash("error", "Dealer not found");

      return res.redirect("/admin/dealerlist");
    }
    return res.render("dealer/profile", {
      data: dealer,
    });
  } catch (error) {
    console.log("Get Dealer Profile Error:", error);

    req.flash("error", "Something went wrong");

    return res.redirect("/admin/dealerlist");
  }
};




