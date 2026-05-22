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
import path from "path";
import { generateBanner } from "../../services/pipeline/generateBanner.js";
import {
  getPersonalizedVideo,
  getVideoStatus,
} from "../../services/video/videoPipeline.js";
import { processDealerBannerPipeline } from "../../services/pipeline/processDealerBannerPipeline.service.js";

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

// ✅ Send OTP

export const sendSmsOtp = async (dealer_mobile_number, otp) => {
  try {
    const message = `Welcome to Nuvoco Super Women Sangini! Your OTP is ${otp}. STRMCM`;

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

    const dealer = await Dealer.findOne({ where: { dealer_mobile_number } });

    if (!dealer) {
      return res.json({ success: false, message: "Dealer not found" }); // ✅ JSON, not redirect
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    await DealerOTP.destroy({ where: { dealer_mobile_number } });
    await DealerOTP.create({ dealer_mobile_number, otp, expiresAt });

    const smsSent = await sendSmsOtp(dealer_mobile_number, otp);

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

// export const uploadDealerImages = async (req, res) => {
//   try {
//     const { dealer_id, language } = req.body;

//     let imageIds = [];
//     try {
//       imageIds = JSON.parse(req.body.image_ids || "[]");
//     } catch {
//       imageIds = [];
//     }
//     // Check dealer
//     const dealer = await Dealer.findOne({
//       where: { id: dealer_id },
//       attributes: ["id"],
//     });

//     if (!dealer) {
//       return res.status(404).json({
//         success: false,
//         message: "Dealer not found",
//       });
//     }

//     // Check files
//     if (!req.files || req.files.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Images required",
//       });
//     }

//     if (req.files.length > 4) {
//       return res.status(400).json({
//         success: false,
//         message: "Only 4 images allowed",
//       });
//     }

//     const results = [];

//     for (let i = 0; i < req.files.length; i++) {
//       const file = req.files[i];
//       const existingId = imageIds[i] ? parseInt(imageIds[i]) : null;

//       if (existingId) {
//         // Find existing record
//         const existing = await DealerImage.findOne({
//           where: { id: existingId, dealer_id },
//         });

//         if (existing) {
//           // Delete old file from disk
//           try {
//             if (fs.existsSync(existing.image)) {
//               fs.unlinkSync(existing.image);
//             }
//           } catch (e) {
//             console.log("Could not delete old file:", e.message);
//           }

//           // Update record
//           await existing.update({ image: file.path, language });
//           results.push(existing);

//           console.log("Deleting file at:", existing.image);
//           console.log("File exists:", fs.existsSync(existing.image));
//         } else {
//           // ID sent but record not found — create new
//           const created = await DealerImage.create({
//             dealer_id,
//             language,
//             image: file.path,
//           });
//           results.push(created);
//         }
//       } else {
//         // No existing ID — create new record
//         const created = await DealerImage.create({
//           dealer_id,
//           language,
//           image: file.path,
//         });
//         results.push(created);
//       }
//     }

//     await DealerImage.update({ language }, { where: { dealer_id } });

//     return res.status(200).json({
//       success: true,
//       message: "Images saved successfully",
//       data: results,
//     });
//   } catch (error) {
//     console.log("Upload Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// export const uploadDealerImages = async (req, res) => {
//   try {
//     const { dealer_id, language } = req.body;
//     console.log("req", req.body);
//     let image_ids = [];
//     try {
//       image_ids = JSON.parse(req.body.image_ids || "[]");
//     } catch {
//       image_ids = [];
//     }
//     console.log("befreo paroce");
//     // const results = await processImagesPipeline({
//     //   files: req.files,
//     //   dealer_id,
//     //   language,
//     //   image_ids,
//     // });
//     // console.log("reslults of pipelieb", results);

//     // return res.json({
//     //   success: true,
//     //   message: "Images saved successfully",
//     //   data: results,
//     // });
//   } catch (error) {
//     console.log("Controller Error:", error.message);

//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// POST — save selected final image

export const uploadDealerImages = async (req, res) => {
  try {
    const { dealer_id, language } = req.body;

    // validation
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Images required",
      });
    }
    if (!language) {
      return res.status(400).json({
        success: false,
        message: "language required",
      });
    }

    const results = await processDealerBannerPipeline({
      files: req.files,
      dealer_id,
      language,
    });

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

// export const uploadDealerImages = async (req, res) => {
//   try {
//     const { dealer_id, language } = req.body;

//     // validation
//     if (!req.files || req.files.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Images required",
//       });
//     }

//     const results = [];

//     // loop uploaded files
//     for (const file of req.files) {
//       // IMPORTANT
//       // use file.buffer
//       const finalImagePath = await generateBanner({
//         personBuffer: file.buffer,
//         language,
//         originalName: file.originalname,
//       });

//       // DB save
//       const created = await DealerImage.create({
//         dealer_id,
//         language,
//         image: finalImagePath,
//       });

//       results.push(created);
//     }

//     return res.json({
//       success: true,
//       message: "Images processed successfully",
//       data: results,
//     });
//   } catch (error) {
//     console.log("Controller Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

export const saveFinalImage = async (req, res) => {
  try {
    const dealer_id = req.session.dealer.id;
    const { image_id } = req.body;
    console.log("dealerid", dealer_id, image_id);

    if (!image_id) {
      return res.status(400).json({
        success: false,
        message: "Please select an image.",
      });
    }

    // Verify this image belongs to this dealer
    const image = await DealerImage.findOne({
      where: { id: image_id, dealer_id },
      attributes: ["id"],
    });
    console.log("image", image);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image not found.",
      });
    }

    // If dealer already has a final image saved, update it — else create new
    const existing = await DealerFinalImage.findOne({ where: { dealer_id } });
    console.log("exsitng", existing);
    if (existing) {
      await existing.update({ image_id });
    } else {
      await DealerFinalImage.create({ dealer_id, image_id });
    }

    await Dealer.update(
      { isImageUploaded: "yes" },
      { where: { id: dealer_id } },
    );

    return res.status(200).json({
      success: true,
      message: "Final image saved successfully.",
    });
  } catch (error) {
    console.log("saveFinalImage Error:", error);
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

// export const getDealerProfile = async (req, res) => {

//   try {

//     const dealerId = Number(req.params.id);

//     if (!dealerId) {
//       return res.status(400).json({
//         success: false,
//         message: "Dealer ID is required",
//       });
//     }

//     const dealer = await Dealer.findOne({

//       where: {
//         id: dealerId,
//       },

//       include: [

//         {
//           model: SalesSpoc,
//           as: "SalesSpocs",
//         },

//         {
//           model: TradeMarketingSpoc,
//           as: "TradeMarketingSpocs",
//         },
//       ],
//     });

//     if (!dealer) {
//       return res.status(404).json({
//         success: false,
//         message: "Dealer not found",
//       });
//     }

//     return res.status(200).json({

//       success: true,

//       data: dealer,
//     });

//   } catch (error) {

//     console.log(
//       "Get Dealer Profile Error:",
//       error
//     );

//     return res.status(500).json({

//       success: false,

//       message: error.message,
//     });
//   }
// };
