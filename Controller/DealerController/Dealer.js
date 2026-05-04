import axios from "axios";
import Dealer from "../../Model/dealerModel.js";
import DealerOTP from "../../Model/dealer/dealerOtp.js";
import MessageModel from "../../Model/dealer/MessageModel.js";

export const renderLogin = async (req, res) => {
  const dealer = req.session.dealer;
  if (dealer) {
    return res.redirect("/");
  }
  return res.render("dealer/auth/dealerLogin", {
    error: req.flash("error")[0] || null, // ✅ Pass flash to template
    success: req.flash("success")[0] || null,
  });
};
export const renderHome = async (req, res) => {
  const dealer = req.session.dealer;

  if (!dealer) {
    return res.redirect("/login");
  }
  console.log("dealer in home", dealer);
  const data = await MessageModel.findAll();
  console.log("mesage model", data);
  return res.render("dealer/welcome-screen", { data });
};

// ✅ Send OTP

export const sendSmsOtp = async (contact, otp) => {
  try {
    const message = `Welcome to Nuvoco Super Women Sangini! Your OTP is ${otp}. STRMCM`;

    const params = {
      APIKey: process.env.SMS_API_KEY,
      senderid: process.env.SMS_SENDER_ID,
      channel: "Trans",
      DCS: 0,
      flashsms: 0,
      number: "91" + contact,
      text: message,
      DLTTemplateId: process.env.SMS_TEMPLATE_ID,
      route: 0,
      PEId: process.env.SMS_PE_ID,
    };

    const response = await axios.get(process.env.SMS_BASE_URL, { params });
    return response.data ? true : false;
  } catch (error) {
    console.log("SMS Error:", error.message);
    return false;
  }
};

// export const sendOTP = async (req, res) => {
//   console.log("send otp called");
//   try {
//     const { contact } = req.body;

//     if (!contact) {
//       return res.json({ success: false, message: "contact required" });
//     }

//     // ✅ Check dealer exists
//     const dealer = await Dealer.findOne({
//       where: { contact: contact },
//     });

//     if (!dealer) {
//       return res.json({ success: false, message: "Dealer not found" });
//     }

//     // ✅ Generate OTP
//     const otp = Math.floor(100000 + Math.random() * 900000).toString();

//     // ✅ Expiry 2 minutes
//     const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
//     console.log("expiresAt", expiresAt);
//     // ✅ Delete old OTP (optional but clean)
//     await DealerOTP.destroy({ where: { contact } });
//     console.log("after destroy");

//     // ✅ Save new OTP
//     await DealerOTP.create({
//       contact,
//       otp,
//       expiresAt,
//     });
//     console.log("befreo sms send");
//     // ✅ Send SMS
//     const smsSent = await sendSmsOtp(contact, otp);
//     console.log("smsendt", smsSent);
//     if (!smsSent) {
//       return res.json({ success: false, message: "Failed to send OTP" });
//     }

//     return res.json({
//       success: true,
//       message: "OTP sent successfully",
//     });
//   } catch (err) {
//     console.log(err);
//     return res.json({ success: false, message: "Something went wrong" });
//   }
// };

// export const verifyOTP = async (req, res) => {
//   try {
//     const { contact, otp } = req.body;

//     if (!contact || !otp) {
//       return res.json({ success: false, message: "All fields required" });
//     }

//     // ✅ Find OTP record
//     const otpRecord = await DealerOTP.findOne({
//       where: { contact, otp },
//     });

//     if (!otpRecord) {
//       return res.json({ success: false, message: "Invalid OTP" });
//     }

//     // ✅ Check expiry
//     if (new Date() > otpRecord.expiresAt) {
//       await DealerOTP.destroy({ where: { contact } });
//       return res.json({ success: false, message: "OTP expired" });
//     }

//     // ✅ Find dealer
//     const dealer = await Dealer.findOne({
//       where: { contact: contact },
//     });

//     if (!dealer) {
//       return res.json({ success: false, message: "Dealer not found" });
//     }

//     // ✅ Create session
//     req.session.dealer = {
//       id: dealer.id,
//       name: dealer.fullname,
//       contact: dealer.contact,
//       region: dealer.region,
//     };

//     // ✅ Delete OTP after success
//     await DealerOTP.destroy({ where: { contact } });

//     return res.json({
//       success: true,
//       message: "Login successful",
//     });
//   } catch (err) {
//     console.log(err);
//     return res.json({ success: false, message: "Something went wrong" });
//   }
// };

// export const sendOTP = async (req, res) => {
//   try {
//     console.log("send otp called")
//     const { contact } = req.body;

//     if (!contact) {
//       req.flash("error", "Contact required");
//       return res.redirect("/login");
//     }

//     const dealer = await Dealer.findOne({ where: { contact } });
//  console.log("dealer",dealer)
//     if (!dealer) {
//       req.flash("error", "Dealer not found");
//       return res.redirect("/login");
//     }

//     const otp = Math.floor(100000 + Math.random() * 900000).toString();
//     console.log("otp",otp)
//     const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

//     await DealerOTP.destroy({ where: { contact } });
//     await DealerOTP.create({ contact, otp, expiresAt });

//     const smsSent = await sendSmsOtp(contact, otp);
//  console.log("smsSent",smsSent)
//     if (!smsSent) {
//       req.flash("error", "Failed to send OTP");
//       return res.redirect("/login");
//     }

//     // ✅ Success — return JSON so JS can show OTP field
//     return res.json({ success: true });

//   } catch (err) {
//     console.log(err);
//     req.flash("error", "Something went wrong");
//     return res.redirect("/login");
//   }
// };

export const sendOTP = async (req, res) => {
  try {
    console.log("send otp called");
    const { contact } = req.body;

    if (!contact) {
      return res.json({ success: false, message: "Contact required" }); // ✅ JSON, not redirect
    }

    const dealer = await Dealer.findOne({ where: { contact } });

    if (!dealer) {
      return res.json({ success: false, message: "Dealer not found" }); // ✅ JSON, not redirect
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    await DealerOTP.destroy({ where: { contact } });
    await DealerOTP.create({ contact, otp, expiresAt });

    const smsSent = await sendSmsOtp(contact, otp);

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
    const { contact, otp } = req.body;

    if (!contact || !otp) {
      // ✅ Return JSON so JS can show error inline (OTP field stays visible)
      return res.json({ success: false, message: "All fields required" });
    }

    const otpRecord = await DealerOTP.findOne({ where: { contact, otp } });

    if (!otpRecord) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    if (new Date() > otpRecord.expiresAt) {
      await DealerOTP.destroy({ where: { contact } });
      return res.json({
        success: false,
        message: "OTP expired. Please request a new one",
      });
    }

    const dealer = await Dealer.findOne({ where: { contact } });

    if (!dealer) {
      return res.json({ success: false, message: "Dealer not found" });
    }

    req.session.dealer = {
      id: dealer.id,
      name: dealer.fullname,
      contact: dealer.contact,
      region: dealer.region,
    };

    await DealerOTP.destroy({ where: { contact } });

    // ✅ Return JSON with redirect URL — JS will follow it
    return res.json({ success: true, redirect: "/" });
  } catch (err) {
    console.log(err);
    return res.json({ success: false, message: "Something went wrong" });
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
  return res.render("dealer/upload-pic");
};

export const renderFinalPic = async (req, res) => {
  return res.render("dealer/final-pic");
};

export const renderThankyouPage = async (req, res) => {
  return res.render("dealer/thankyou");
};