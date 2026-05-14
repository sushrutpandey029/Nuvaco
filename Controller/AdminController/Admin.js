import AdminModel from "../../Model/adminModel.js";
import { sendMail } from "../../utils/mailer.js";

import Dealer from "../../Model/dealerModel.js";
import TradeMarketingSpoc from "../../Model/tradeMarketingSpocModel.js";
import SalesSpoc from "../../Model/salesSpocModel.js";

import { Op } from "sequelize";
import XLSX from "xlsx";
import axios from "axios";
import bcrypt from "bcrypt";
import RegionVideo from "../../Model/regionVideoModel.js";
import { states } from "../../constants/states.js";
import { raw } from "mysql2";
import fs from "fs";
import DealerImage from "../../Model/dealer/DealerImage.js";
import DealerFinalImage from "../../Model/dealer/DealerFinalImage.js";
import ExcelJS from "exceljs";

export const AdminRegister = async (req, res) => {
  try {
    const { fullname, email, password, phonenumber } = req.body;

    if (!fullname || !email || !password || !phonenumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const isDuplicateEmail = await AdminModel.findOne({ where: { email } });
    if (isDuplicateEmail) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashpassword = await bcrypt.hash(password, 10);

    const newAdmin = await AdminModel.create({
      fullname,
      email,
      password: hashpassword,
      phonenumber,
    });

    await sendMail({
      to: newAdmin.email,
      subject: "Welcome to Nuvaco",
      html: `
  <div style="font-family: Arial, sans-serif; background-color:#f4f6f8; padding:20px;">
    <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:8px; padding:30px;">
      
      <h2 style="color:#333; text-align:center;">Welcome to Nuvaco</h2>
      
      <p style="font-size:16px; color:#555;">
        Hi <strong>${newAdmin.fullname}</strong>,
      </p>

      <p style="font-size:15px; color:#555;">
        Your admin account has been successfully created. You can now access the platform using your credentials below:
      </p>

      <div style="background:#f1f1f1; padding:15px; border-radius:6px; margin:20px 0;">
        <p style="margin:5px 0;"><strong>Email:</strong> ${newAdmin.email}</p>
        <p style="margin:5px 0;"><strong>Password:</strong> ${password}</p>
      </div>

      <p style="font-size:14px; color:#777;">
        For security reasons, we recommend changing your password after your first login.
      </p>

      <div style="text-align:center; margin:30px 0;">
        <a href="http://localhost:3000/" 
           style="background:#007bff; color:#fff; padding:12px 20px; text-decoration:none; border-radius:5px;">
          Login to Dashboard
        </a>
      </div>

      <p style="font-size:12px; color:#aaa; text-align:center;">
        © ${new Date().getFullYear()} Nuvaco. All rights reserved.
      </p>

    </div>
  </div>
  `,
    });

    return res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      data: newAdmin,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const adminloginview = async (req, res) => {
  const loggedInAdmin = req.session.admin;

  if (loggedInAdmin) {
    return res.redirect("dashboard");
  }
  res.render("admin/adminLogin");
};

export const adminlogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const captcha = req.body["g-recaptcha-response"];

    // ✅ 1. Basic validation
    if (!email || !password) {
      req.flash("error", "Email and Password are required");
      return res.redirect("login");
    }

    // ✅ 2. Captcha check
    if (!captcha) {
      req.flash("error", "Please verify captcha");
      return res.redirect("login");
    }

    // ✅ 3. Verify captcha from Google
    const response = await axios.post(process.env.VERIFY_CAPTCHA_URL, null, {
      params: {
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: captcha,
      },
    });

    if (!response.data.success) {
      req.flash("error", "Captcha verification failed");
      return res.redirect("login");
    }

    // ✅ 4. Check admin
    const admin = await AdminModel.findOne({ where: { email } });

    if (!admin) {
      req.flash("error", "Admin not found");
      return res.redirect("login");
    }

    // ✅ 5. Password check
    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      req.flash("error", "Invalid password");
      return res.redirect("login");
    }

    // ✅ 6. Store session (simple login)
    req.session.admin = {
      id: admin.id,
      email: admin.email,
      fullname: admin.fullname,
    };

    // ✅ 7. Redirect
    return res.redirect("dashboard");
  } catch (error) {
    console.error(error);
    req.flash("error", "Something went wrong");
    return res.redirect("login");
  }
};

export const adminDashboard = async (req, res) => {
  try {
    const admin = req.session.admin;

    if (!admin) {
      return res.redirect("login");
    }

    const dealers = await Dealer.findAll();

    const totalDealers = dealers.length;

    const uploadedPics = dealers.filter(
      (dealer) => dealer.isImageUploaded === "yes",
    ).length;

    const pendingPics = dealers.filter(
      (dealer) => dealer.isImageUploaded === "no",
    ).length;

    const onboarded = totalDealers;

    const chartLabels = ["Onboarded", "Pics Uploaded", "Pending"];

    const chartData = [onboarded, uploadedPics, pendingPics];

    return res.render("admin/dashboard", {
      admin,

      totalDealers,

      onboarded,

      uploadedPics,

      pendingPics,

      chartLabels: JSON.stringify(chartLabels),

      chartData: JSON.stringify(chartData),
    });
  } catch (error) {
    console.log("Dashboard Error:", error);

    req.flash("error", "Something went wrong");

    return res.redirect("/admin/login");
  }
};

export const adminChangePassword = async (req, res) => {
  try {
    const adminSession = req.session.admin;
    if (!adminSession) return res.redirect("login");

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.render("admin/adminprofile", {
        admin: adminSession,
        error: "All fields are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.render("admin/adminprofile", {
        admin: adminSession,
        error: "Passwords do not match",
      });
    }

    const admin = await AdminModel.findByPk(adminSession.id);
    if (!admin) {
      return res.render("admin/adminprofile", {
        admin: adminSession,
        error: "Admin not found",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.render("admin/adminprofile", {
        admin: adminSession,
        error: "Current password is incorrect",
      });
    }

    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);
    await admin.save();

    return res.render("admin/adminprofile", {
      admin: adminSession,
      success: "Password changed successfully",
    });
  } catch (err) {
    console.log(err);
    return res.render("admin/adminprofile", {
      admin: req.session.admin,
      error: "Server error",
    });
  }
};

export const adminLogout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ success: false });
    }

    res.clearCookie("connect.sid");

    return res.redirect("/admin/login");
  });
};

export const adminProfile = async (req, res) => {
  const admin = req.session.admin;
  if (!admin) {
    return res.redirect("login");
  }

  res.render("admin/adminprofile", { admin });
};

// export const dealerList = async (req, res) => {
//   try {
//     const admin = req.session.admin;
//     if (!admin) return res.redirect("login");

//     let { page = 1, limit = 10, search = "" } = req.query;

//     page = parseInt(page) || 1;
//     limit = parseInt(limit) || 10;

//     if (page < 1) page = 1;
//     if (limit < 1) limit = 10;

//     search = search.trim();

//     const offset = (page - 1) * limit;

//     const whereCondition = search
//       ? {
//           fullname: {
//             [Op.like]: `%${search}%`,
//           },
//         }
//       : {};

//     const { count, rows } = await Dealer.findAndCountAll({
//       where: whereCondition,
//       limit,
//       offset,
//       order: [["createdAt", "DESC"]],
//     });

//     if (req.xhr || req.headers.accept?.includes("json")) {
//       return res.status(200).json({
//         success: true,
//         total: count,
//         currentPage: page,
//         totalPages: Math.ceil(count / limit),
//         data: rows || [],
//       });
//     }

//     return res.render("admin/dealer-list", {
//       admin,
//       dealers: rows || [],
//       currentPage: page,
//       totalPages: Math.ceil(count / limit),
//       search,
//     });
//   } catch (error) {
//     console.error("❌ Dealer List Error:", error);
//     return res.status(500).send("Server Error");
//   }
// };

export const dealerList = async (req, res) => {
  try {
    const admin = req.session.admin;

    if (!admin) {
      return res.redirect("login");
    }

    // FETCH ALL DEALERS
    const dealers = await Dealer.findAll({
      order: [["createdAt", "DESC"]],
    });

    // JSON RESPONSE
    if (req.xhr || req.headers.accept?.includes("json")) {
      return res.status(200).json({
        success: true,

        data: dealers || [],
      });
    }

    // RENDER PAGE
    return res.render("admin/dealer-list", {
      admin,

      dealers: dealers || [],
    });
  } catch (error) {
    console.error("❌ Dealer List Error:", error);

    req.flash("error", "Error fetching dealer list");

    return res.redirect("back");
  }
};

// export const getDealers = async (req, res) => {
//   try {
//     let { page = 1, limit = 10, search = "" } = req.query;

//     page = parseInt(page);
//     limit = parseInt(limit);

//     const offset = (page - 1) * limit;

//     const whereCondition = search
//       ? {
//         dealer_name: {
//           [Op.like]: `%${search}%`,
//         },
//       }
//       : {};

//     const { count, rows } = await Dealer.findAndCountAll({
//       where: whereCondition,
//       limit,
//       offset,
//       order: [["createdAt", "DESC"]],
//     });

//     return res.status(200).json({
//       success: true,
//       total: count,
//       currentPage: page,
//       totalPages: Math.ceil(count / limit),
//       data: rows,
//     });

//   } catch (error) {
//     console.error("Get Dealers Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };

export const dealerDetail = async (req, res) => {
  const admin = req.session.admin;
  if (!admin) {
    return res.redirect("login");
  }

  res.render("admin/dealerDetail", { admin });
};

export const dealerRegister = async (req, res) => {
  const admin = req.session.admin;
  if (!admin) {
    return res.redirect("login");
  }

  res.render("admin/registerDealer", { admin, states });
};

export const videoMessage = async (req, res) => {
  const admin = req.session.admin;
  if (!admin) {
    return res.redirect("login");
  }
  res.render("admin/video-message", { admin, states });
};

export const uploadRegionVideo = async (req, res) => {
  try {
    const { state } = req.body;

    // ❌ Validation
    if (!state) {
      req.flash("error", "Region required");
      return res.redirect("add-state-message");
    }

    if (!req.file) {
      req.flash("error", "Video file required");
      return res.redirect("add-state-message");
    }

    // ✅ Save data
    const saveData = await RegionVideo.create({
      state,
      video: req.file.path,
    });

    // ✅ Success message
    req.flash("success", "Video uploaded successfully");
    return res.redirect("state-message-list"); // or specific page
  } catch (error) {
    console.log("ERROR =>", error);

    req.flash("error", "Something went wrong");
    return res.redirect("add-state-message");
  }
};

// export const registerDealer = async (req, res) => {
//   try {
//     const {
//       state,
//       dealer_code,
//       shop_name,
//       dealer_person,
//       district,
//       address,
//       pincode,
//       dealer_mobile_number,
//       sales_spoc,
//       trade_marketing_spoc,
//     } = req.body;

//     // ✅ Basic validation
//     if (
//       !state ||
//       !dealer_code ||
//       !shop_name ||
//       !dealer_person ||
//       !district ||
//       !address ||
//       !pincode ||
//       !dealer_mobile_number
//     ) {
//       req.flash("error", "All dealer fields are required");
//       return res.redirect("back");
//     }

//     // ✅ Check duplicate dealer code
//     const existingDealer = await Dealer.findOne({
//       where: {
//         dealer_code,
//       },
//     });

//     if (existingDealer) {
//       req.flash("error", "Dealer code already exists");
//       return res.redirect("dealerregister");
//     }

//     // ✅ Create Dealer
//     const dealer = await Dealer.create({
//       state,
//       dealer_code,
//       shop_name,
//       dealer_person,
//       district,
//       address,
//       pincode,
//       dealer_mobile_number,
//     });

//     // ✅ Create Sales SPOC
//     if (sales_spoc) {
//       await SalesSpoc.create({
//         dealer_id: dealer.id,
//         name: sales_spoc.name,
//         email: sales_spoc.email,
//         contact_number: sales_spoc.contact_number,
//       });
//     }

//     // ✅ Create Trade Marketing SPOC
//     if (trade_marketing_spoc) {
//       await TradeMarketingSpoc.create({
//         dealer_id: dealer.id,
//         name: trade_marketing_spoc.name,
//         email: trade_marketing_spoc.email,
//         contact_number: trade_marketing_spoc.contact_number,
//       });
//     }

//     // ✅ Success message
//     req.flash("success", "Dealer registered successfully");

//     return res.redirect("/admin/registration-delars"); // or your form page
//   } catch (error) {
//     console.log("Registration Error:", error);

//     // ❗ Handle duplicate dealer_code
//     if (error.name === "SequelizeUniqueConstraintError") {
//       req.flash("error", "Dealer code already exists");
//       return res.redirect("back");
//     }

//     req.flash("error", "Something went wrong");
//     return res.redirect("back");
//   }
// };

// export const uploadDealersExcel = async (req, res) => {
//   try {
//     // Check file
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: "Excel file required",
//       });
//     }

//     // Read excel
//     const workbook = XLSX.readFile(req.file.path);

//     const sheetName = workbook.SheetNames[0];

//     const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

//     let uploaded = 0;

//     let skipped = 0;

//     // Loop rows
//     for (const row of sheetData) {
//       console.log(row);

//       // Duplicate check
//       const existingDealer = await Dealer.findOne({
//         where: {
//           dealer_code: row.dealer_code,
//         },
//       });

//       if (existingDealer) {
//         skipped++;

//         continue;
//       }

//       // Create Dealer
//       const dealer = await Dealer.create({
//         state: row.state,

//         dealer_code: row.dealer_code,

//         shop_name: row.shop_name,

//         dealer_person: row.dealer_person,

//         district: row.district,

//         address: row.address,

//         pincode: row.pincode,

//         dealer_mobile_number: row.dealer_mobile_number,
//       });

//       // Create Sales SPOC
//       const salesData = await SalesSpoc.create({
//         dealer_id: dealer.id,

//         name: row.sales_name,

//         email: row.sales_email,

//         contact_number: row.sales_contact_number,
//       });

//       // Create Trade Marketing SPOC
//       const tradeData = await TradeMarketingSpoc.create({
//         dealer_id: dealer.id,

//         name: row.trade_name,

//         email: row.trade_email,

//         contact_number: row.trade_contact_number,
//       });

//       uploaded++;
//     }

//     return res.status(201).json({
//       success: true,

//       message: "Excel uploaded successfully",

//       uploaded,

//       skipped,
//     });
//   } catch (error) {
//     console.log("Excel Upload Error:", error);

//     return res.status(500).json({
//       success: false,

//       message: error.message,
//     });
//   }
// };

// export const uploadDealersExcel = async (req, res) => {
//   try {
//     // CHECK FILE
//     if (!req.file) {
//       req.flash("error", "Excel file required");

//       return res.redirect("dealerregister");
//     }

//     // READ EXCEL
//     const workbook = XLSX.read(req.file.buffer, {
//       type: "buffer",
//     });
//     const sheetName = workbook.SheetNames[0];

//     const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

//     let uploaded = 0;

//     let skipped = 0;

//     // LOOP ROWS
//     for (const row of sheetData) {
//       // DUPLICATE CHECK
//       const existingDealer = await Dealer.findOne({
//         where: {
//           dealer_code: row.dealer_code,
//         },
//       });

//       if (existingDealer) {
//         skipped++;

//         continue;
//       }

//       // CREATE DEALER
//       const dealer = await Dealer.create({
//         state: row.state,

//         dealer_code: row.dealer_code,

//         shop_name: row.shop_name,

//         dealer_person: row.dealer_person,

//         district: row.district,

//         address: row.address,

//         pincode: row.pincode,

//         dealer_mobile_number: row.dealer_mobile_number,
//       });

//       // SALES SPOC
//       if (row.sales_name || row.sales_email || row.sales_contact_number) {
//         await SalesSpoc.create({
//           dealer_id: dealer.id,

//           name: row.sales_name,

//           email: row.sales_email,

//           contact_number: row.sales_contact_number,
//         });
//       }

//       // TRADE SPOC
//       if (row.trade_name || row.trade_email || row.trade_contact_number) {
//         await TradeMarketingSpoc.create({
//           dealer_id: dealer.id,

//           name: row.trade_name,

//           email: row.trade_email,

//           contact_number: row.trade_contact_number,
//         });
//       }

//       uploaded++;
//     }

//     req.flash(
//       "success",
//       `${uploaded} dealers uploaded successfully. ${skipped} skipped due to duplicate dealer code.`,
//     );

//     return res.redirect("/admin/dealerlist");
//   } catch (error) {
//     console.log("Excel Upload Error:", error);

//     req.flash("error", "Error uploading excel");

//     return res.redirect("dealerregister");
//   }
// };

// export const registerDealer = async (req, res) => {
//   try {
//     console.log("BODY =>", req.body);

//     const {
//       state,

//       dealer_code,

//       shop_name,

//       dealer_person,

//       district,

//       address,

//       pincode,

//       dealer_mobile_number,

//       club_millennium,

//       sales_spoc,

//       trade_marketing_spoc,
//     } = req.body;

//     // =========================
//     // VALIDATION
//     // =========================

//     if (!dealer_code) {
//       return res.status(400).json({
//         success: false,

//         message: "Dealer code is required",
//       });
//     }

//     // =========================
//     // CHECK DUPLICATE
//     // =========================

//     const existingDealer = await Dealer.findOne({
//       where: {
//         dealer_code,
//       },
//     });

//     if (existingDealer) {
//       return res.status(400).json({
//         success: false,

//         message: "Dealer code already exists",
//       });
//     }

//     // =========================
//     // CREATE DEALER
//     // =========================

//     const dealer = await Dealer.create({
//       state,

//       dealer_code,

//       shop_name,

//       dealer_person,

//       district,

//       address,

//       pincode,

//       dealer_mobile_number,

//       club_millennium,
//     });

//     // =========================
//     // CREATE SALES SPOC
//     // =========================

//     const salesData = await SalesSpoc.create({
//       dealer_id: dealer.id,

//       name: sales_spoc?.name,

//       email: sales_spoc?.email,

//       contact_number: sales_spoc?.contact_number,
//     });

//     // =========================
//     // CREATE TRADE SPOC
//     // =========================

//     const tradeData = await TradeMarketingSpoc.create({
//       dealer_id: dealer.id,

//       name: trade_marketing_spoc?.name,

//       email: trade_marketing_spoc?.email,

//       contact_number: trade_marketing_spoc?.contact_number,
//     });

//     // =========================
//     // SUCCESS RESPONSE
//     // =========================

//     return res.status(201).json({
//       success: true,

//       message: "Dealer registered successfully",

//       data: {
//         dealer,

//         sales_spoc: salesData,

//         trade_marketing_spoc: tradeData,
//       },
//     });
//   } catch (error) {
//     console.log("Registration Error:", error);

//     return res.status(500).json({
//       success: false,

//       message: error.message,
//     });
//   }
// };

// export const uploadDealersExcel = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: "Excel file required",
//       });
//     }

//     const workbook = XLSX.read(req.file.buffer, { type: "buffer" });

//     const sheetName = workbook.SheetNames[0];

//     const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

//     let uploaded = 0;

//     let skipped = 0;

//     for (const row of sheetData) {
//       try {
//         console.log("ROW =>", row);

//         // =========================
//         // FIX COLUMN NAMES
//         // =========================

//         const mobileNumber =
//           row.dealer_mobile_number || row["dealer_mobile_ number"];

//         const tradeEmail = row.trade_email || row.trade_email4;

//         // =========================
//         // REQUIRED FIELD CHECK
//         // =========================

//         if (!row.dealer_code || !mobileNumber) {
//           console.log("Missing Required Fields");

//           skipped++;

//           continue;
//         }

//         // =========================
//         // DUPLICATE CHECK
//         // =========================

//         const existingDealer = await Dealer.findOne({
//           where: {
//             dealer_code: row.dealer_code,
//           },
//         });

//         if (existingDealer) {
//           console.log("Duplicate Dealer");

//           skipped++;

//           continue;
//         }

//         // =========================
//         // CREATE DEALER
//         // =========================

//         const dealer = await Dealer.create({
//           state: row.state,

//           dealer_code: String(row.dealer_code),

//           shop_name: row.shop_name,

//           dealer_person: row.dealer_person,

//           district: row.district,

//           address: row.address,

//           pincode: String(row.pincode),

//           dealer_mobile_number: String(mobileNumber),

//           club_millennium: row.club_millennium || "No",
//         });

//         // =========================
//         // SALES SPOC
//         // =========================

//         if (row.sales_name) {
//           await SalesSpoc.create({
//             dealer_id: dealer.id,

//             name: row.sales_name,

//             email: row.sales_email || "",

//             contact_number: String(row.sales_contact_number || ""),
//           });
//         }

//         // =========================
//         // TRADE MARKETING SPOC
//         // =========================

//         if (row.trade_name) {
//           await TradeMarketingSpoc.create({
//             dealer_id: dealer.id,

//             name: row.trade_name,

//             email: tradeEmail || "",

//             contact_number: String(row.trade_contact_number || ""),
//           });
//         }

//         uploaded++;
//       } catch (rowError) {
//         console.log("ROW ERROR =>", rowError);

//         skipped++;
//       }
//     }

//     return res.status(201).json({
//       success: true,

//       message: "Excel uploaded successfully",

//       uploaded,

//       skipped,
//     });
//   } catch (error) {
//     console.log("Excel Upload Error:", error);

//     return res.status(500).json({
//       success: false,

//       message: error.message,
//     });
//   }
// };
export const registerDealer = async (req, res) => {
  try {
    console.log("BODY =>", req.body);

    const {
      state,

      dealer_code,

      shop_name,

      dealer_person,

      district,

      address,

      pincode,

      dealer_mobile_number,

      club_millennium,

      sales_spoc,

      trade_marketing_spoc,
    } = req.body;

    // =========================
    // VALIDATION
    // =========================

    if (!dealer_code) {
      req.flash("error", "Dealer code is required");

      return res.redirect("dealerlist");
    }

    // =========================
    // CHECK DUPLICATE
    // =========================

    const existingDealer = await Dealer.findOne({
      where: {
        dealer_code,
      },
    });

    if (existingDealer) {
      req.flash("error", "Dealer code already exists");

      return res.redirect("dealerlist");
    }

    // =========================
    // CREATE DEALER
    // =========================

    const dealer = await Dealer.create({
      state,

      dealer_code,

      shop_name,

      dealer_person,

      district,

      address,

      pincode,

      dealer_mobile_number,

      club_millennium,
    });

    // =========================
    // CREATE SALES SPOC
    // =========================

    let salesData = null;

    if (sales_spoc?.name) {
      salesData = await SalesSpoc.create({
        dealer_id: dealer.id,

        name: sales_spoc.name,

        email: sales_spoc.email,

        contact_number: sales_spoc.contact_number,
      });
    }

    // =========================
    // CREATE TRADE SPOC
    // =========================

    let tradeData = null;

    if (trade_marketing_spoc?.name) {
      tradeData = await TradeMarketingSpoc.create({
        dealer_id: dealer.id,

        name: trade_marketing_spoc.name,

        email: trade_marketing_spoc.email,

        contact_number: trade_marketing_spoc.contact_number,
      });
    }

    // =========================
    // SUCCESS MESSAGE
    // =========================

    req.flash("success", "Dealer registered successfully");

    return res.redirect("/admin/dealerlist");
  } catch (error) {
    console.log("Registration Error:", error);

    req.flash("error", error.message || "Something went wrong");

    return res.redirect("dealerlist");
  }
};

export const renderEditDealer = async (req, res) => {
  try {
    const admin = req.session.admin;

    if (!admin) {
      return res.redirect("/admin/login");
    }

    const { id } = req.params;

    const dealer = await Dealer.findByPk(id, {
      include: [
        {
          model: SalesSpoc,
        },

        {
          model: TradeMarketingSpoc,
        },
      ],
    });

    if (!dealer) {
      req.flash("error", "Dealer not found");

      return res.redirect("/admin/dealerlist");
    }
    console.log("deale rin redniern file", dealer);

    return res.render("admin/edit-dealer", {
      admin,

      dealer,
    });
  } catch (error) {
    console.log("Render Edit Dealer Error:", error);

    req.flash("error", "Something went wrong");

    return res.redirect("/admin/dealerlist");
  }
};

export const updateDealer = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      state,

      dealer_code,

      shop_name,

      dealer_person,

      district,

      address,

      pincode,

      dealer_mobile_number,

      club_millennium,

      sales_spoc,

      trade_marketing_spoc,
    } = req.body;

    const dealer = await Dealer.findByPk(id);

    if (!dealer) {
      req.flash("error", "Dealer not found");

      return res.redirect("/admin/dealerlist");
    }

    // =========================
    // CHECK DUPLICATE
    // =========================

    const existingDealer = await Dealer.findOne({
      where: {
        dealer_code,
      },
    });

    if (existingDealer && existingDealer.id !== dealer.id) {
      req.flash("error", "Dealer code already exists");

      return res.redirect("back");
    }

    // =========================
    // UPDATE DEALER
    // =========================

    await dealer.update({
      state,

      dealer_code,

      shop_name,

      dealer_person,

      district,

      address,

      pincode,

      dealer_mobile_number,

      club_millennium,
    });

    // =========================
    // SALES SPOC
    // =========================

    const existingSales = await SalesSpoc.findOne({
      where: {
        dealer_id: dealer.id,
      },
    });

    if (existingSales) {
      await existingSales.update({
        name: sales_spoc?.name,

        email: sales_spoc?.email,

        contact_number: sales_spoc?.contact_number,
      });
    } else if (sales_spoc?.name) {
      await SalesSpoc.create({
        dealer_id: dealer.id,

        name: sales_spoc.name,

        email: sales_spoc.email,

        contact_number: sales_spoc.contact_number,
      });
    }

    // =========================
    // TRADE SPOC
    // =========================

    const existingTrade = await TradeMarketingSpoc.findOne({
      where: {
        dealer_id: dealer.id,
      },
    });

    if (existingTrade) {
      await existingTrade.update({
        name: trade_marketing_spoc?.name,

        email: trade_marketing_spoc?.email,

        contact_number: trade_marketing_spoc?.contact_number,
      });
    } else if (trade_marketing_spoc?.name) {
      await TradeMarketingSpoc.create({
        dealer_id: dealer.id,

        name: trade_marketing_spoc.name,

        email: trade_marketing_spoc.email,

        contact_number: trade_marketing_spoc.contact_number,
      });
    }

    req.flash("success", "Dealer updated successfully");

    return res.redirect("/admin/dealerlist");
  } catch (error) {
    console.log("Update Dealer Error:", error);

    req.flash("error", error.message);

    return res.redirect("back");
  }
};

export const deleteDealer = async (req, res) => {
  try {
    const { id } = req.params;

    const dealer = await Dealer.findByPk(id);

    if (!dealer) {
      req.flash("error", "Dealer not found");

      return res.redirect("/admin/dealerlist");
    }

    // DELETE SPOCS

    await SalesSpoc.destroy({
      where: {
        dealer_id: id,
      },
    });

    await TradeMarketingSpoc.destroy({
      where: {
        dealer_id: id,
      },
    });

    // DELETE DEALER

    await dealer.destroy();

    req.flash("success", "Dealer deleted successfully");

    return res.redirect("/admin/dealerlist");
  } catch (error) {
    console.log("Delete Dealer Error:", error);

    req.flash("error", "Something went wrong");

    return res.redirect("/admin/dealerlist");
  }
};

export const uploadDealersExcel = async (req, res) => {
  try {
    // =========================
    // FILE CHECK
    // =========================

    if (!req.file) {
      req.flash("error", "Excel file is required");

      return res.redirect("back");
    }

    // =========================
    // READ EXCEL FILE
    // =========================

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });

    const sheetName = workbook.SheetNames[0];

    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // =========================
    // EMPTY SHEET CHECK
    // =========================

    if (!sheetData || sheetData.length === 0) {
      req.flash("error", "Excel sheet is empty");

      return res.redirect("back");
    }

    let uploaded = 0;

    let skipped = 0;

    // =========================
    // LOOP THROUGH EXCEL DATA
    // =========================

    for (const row of sheetData) {
      try {
        console.log("ROW =>", row);

        // =========================
        // FIX COLUMN NAMES
        // =========================

        const mobileNumber =
          row.dealer_mobile_number || row["dealer_mobile_ number"];

        const tradeEmail = row.trade_email || row.trade_email4;

        // =========================
        // REQUIRED FIELD CHECK
        // =========================

        if (!mobileNumber) {
          skipped++;

          continue;
        }

        // =========================
        // DUPLICATE CHECK
        // =========================

        const existingDealer = await Dealer.findOne({
          where: {
            dealer_code: String(row.dealer_code),
          },
        });

        if (existingDealer) {
          console.log("Duplicate Dealer");

          skipped++;

          continue;
        }

        // =========================
        // CREATE DEALER
        // =========================

        const dealer = await Dealer.create({
          state: row.state || "",

          dealer_code: String(row.dealer_code),

          shop_name: row.shop_name || "",

          dealer_person: row.dealer_person || "",

          district: row.district || "",

          address: row.address || "",

          pincode: String(row.pincode || ""),

          dealer_mobile_number: String(mobileNumber),

          club_millennium: row.club_millennium || "No",
        });

        // =========================
        // SALES SPOC
        // =========================

        if (row.sales_name) {
          await SalesSpoc.create({
            dealer_id: dealer.id,

            name: row.sales_name,

            email: row.sales_email || "",

            contact_number: String(row.sales_contact_number || ""),
          });
        }

        // =========================
        // TRADE MARKETING SPOC
        // =========================

        if (row.trade_name) {
          await TradeMarketingSpoc.create({
            dealer_id: dealer.id,

            name: row.trade_name,

            email: tradeEmail || "",

            contact_number: String(row.trade_contact_number || ""),
          });
        }

        uploaded++;
      } catch (rowError) {
        console.log("ROW ERROR =>", rowError);

        skipped++;
      }
    }

    // =========================
    // SUCCESS MESSAGE
    // =========================

    req.flash(
      "success",
      `${uploaded} dealers uploaded successfully and ${skipped} skipped`,
    );

    return res.redirect("dealerlist");
  } catch (error) {
    console.log("Excel Upload Error:", error);

    req.flash(
      "error",
      error.message || "Something went wrong while uploading Excel",
    );

    return res.redirect("dealerregister");
  }
};

export const getDealers = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const offset = (page - 1) * limit;

    const whereCondition = search
      ? {
          dealer_name: {
            [Op.like]: `%${search}%`,
          },
        }
      : {};

    const { count, rows } = await Dealer.findAndCountAll({
      where: whereCondition,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      total: count,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      data: rows,
    });
  } catch (error) {
    console.error("Get Dealers Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getDealerDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const dealerData = await Dealer.findOne({
      where: { id },

      include: [
        {
          model: SalesSpoc,
        },
        {
          model: TradeMarketingSpoc,
        },
      ],
    });

    return res.render("admin/view-dealer-detail", {
      data: dealerData,
    });
  } catch (err) {
    console.log(err);

    req.flash("error", "Error in getting details");
    return res.redirect("/admin/dealerlist");
  }
};

export const getDealerImages = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("in dealer image", id);

    const data = await DealerImage.findAll({
      where: { dealer_id: id },

      include: [
        {
          model: DealerFinalImage,
          where: { dealer_id: id },
          required: false,
        },
      ],
    });

    return res.render("admin/view-dealer-images", {
      data,
    });
  } catch (err) {
    console.log(err);

    req.flash("error", "Error in getting details");

    return res.redirect("/admin/dealerlist");
  }
};

// export const getRegionVideoList = async (req, res) => {

//   try {

//     //  PAGINATION

//     const page = parseInt(req.query.page) || 1;

//     const limit = parseInt(req.query.limit) || 15;

//     const offset = (page - 1) * limit;

//     // FETCH DATA
//     const { count, rows } = await RegionVideo.findAndCountAll({

//       limit,

//       offset,

//       order: [["id", "DESC"]],

//     });

//     return res.status(200).json({

//       success: true,

//       current_page: page,

//       total_pages: Math.ceil(count / limit),

//       total_records: count,

//       per_page: limit,

//       data: rows,
//     });

//   } catch (error) {
//     console.log("Region video List Error:", error);

//     return res.status(500).json({
//       success: false,

//       message: error.message,
//     });
//   }
// };

export const getRegionVideoList = async (req, res) => {
  try {
    // PAGINATION
    const page = parseInt(req.query.page) || 1;

    const limit = parseInt(req.query.limit) || 15;

    const offset = (page - 1) * limit;

    // FETCH DATA
    const { count, rows } = await RegionVideo.findAndCountAll({
      limit,

      offset,

      order: [["id", "DESC"]],
    });

    console.log("data", JSON.stringify(rows, null, 2));
    console.log("data count", count);

    return res.render("admin/state-message-list", {
      videos: rows,

      current_page: page,

      total_pages: Math.ceil(count / limit),

      total_records: count,

      per_page: limit,
    });
  } catch (error) {
    console.log("Region video List Error:", error);

    req.flash("error", "Error in fetching region videos");

    return res.redirect("back");
  }
};

// export const editRegionVideo = async ( req, res ) => {

//   try {
//     const videoId = Number(req.params.id);

//     // FIND VIDEO

//     const regionVideo = await RegionVideo.findByPk( videoId );

//     if (!regionVideo) {
//       return res.status(404).json({

//         success: false,
//         message: "Video not found",
//       });
//     }

//     //  Get Body DataTypes
//     const { state } = req.body;

//     // update DataTypes
//     await regionVideo.update({

//       state: state || regionVideo.region,

//       video: req.file? req.file.path : regionVideo.video,
//     });

//     return res.status(200).json({
//       success: true,

//       message: "Region video updated successfully",

//       data: regionVideo,
//     });

//   } catch (error) {
//     console.log("Edit Region Video Erro:", error);

//     return res.status(500).json({

//       success: false,

//       message: error.message,
//     });

//   }
// };

// export const deleteRegionVideo = async ( req, res) => {

//     try {

//       const videoId =
//         Number(req.params.id);

//       // =========================
//       // FIND VIDEO
//       // =========================

//       const regionVideo =
//         await RegionVideo.findByPk(
//           videoId
//         );

//       if (!regionVideo) {

//         return res.status(404).json({

//           success: false,

//           message:
//             "Video not found",
//         });
//       }

//       // =========================
//       // DELETE VIDEO FILE
//       // =========================

//       if (
//         regionVideo.video &&
//         fs.existsSync(regionVideo.video)
//       ) {

//         fs.unlinkSync(
//           regionVideo.video
//         );
//       }

//       // =========================
//       // DELETE DB RECORD
//       // =========================

//       await regionVideo.destroy();

//       return res.status(200).json({

//         success: true,

//         message:
//           "Region video deleted successfully",
//       });

//     } catch (error) {

//       console.log(
//         "Delete Region Video Error:",
//         error
//       );

//       return res.status(500).json({

//         success: false,

//         message: error.message,
//       });
//     }
// };

export const editStateVideo = async (req, res) => {
  try {
    const videoId = Number(req.params.id);

    // FIND VIDEO
    const regionVideo = await RegionVideo.findByPk(videoId);

    if (!regionVideo) {
      req.flash("error", "Video not found");

      return res.redirect("back");
    }

    // BODY DATA
    const { state } = req.body;

    // UPDATE DATA
    await regionVideo.update({
      state: state || regionVideo.state,

      video: req.file ? req.file.path : regionVideo.video,
    });

    req.flash("success", "Region video updated successfully");

    return res.redirect("/admin/state-message-list");
  } catch (error) {
    console.log("Edit Region Video Error:", error);

    req.flash("error", "Something went wrong");

    return res.redirect("back");
  }
};

export const deleteRegionVideo = async (req, res) => {
  try {
    const videoId = Number(req.params.id);
    console.log("delte api");
    // FIND VIDEO
    const regionVideo = await RegionVideo.findByPk(videoId);

    if (!regionVideo) {
      req.flash("error", "Video not found");

      return res.redirect("/admin/state-message-list");
    }

    // DELETE VIDEO FILE
    if (regionVideo.video && fs.existsSync(regionVideo.video)) {
      fs.unlinkSync(regionVideo.video);
    }

    // DELETE DB RECORD
    await regionVideo.destroy();

    req.flash("success", "Region video deleted successfully");

    return res.redirect("/admin/state-message-list");
  } catch (error) {
    console.log("Delete Region Video Error:", error);

    req.flash("error", "Something went wrong");

    return res.redirect("/admin/state-message-list");
  }
};

export const renderEditStateMessage = async (req, res) => {
  const videoId = Number(req.params.id);

  // FIND VIDEO
  const regionVideo = await RegionVideo.findByPk(videoId);

  if (!regionVideo) {
    req.flash("error", "Video not found");

    return res.redirect("back");
  }

  res.render("admin/state-message-edit", { data: regionVideo });
};

export const downloadDealerExcel = async (req, res) => {
  try {
    // FETCH DEALERS WITH RELATIONS
    const dealers = await Dealer.findAll({
      include: [
        {
          model: SalesSpoc,
        },
        {
          model: TradeMarketingSpoc,
        },
      ],

      order: [["id", "DESC"]],
    });

    // CREATE WORKBOOK
    const workbook = new ExcelJS.Workbook();

    const worksheet = workbook.addWorksheet("Dealer List");

    // COLUMNS
    worksheet.columns = [
      {
        header: "State",
        key: "state",
        width: 20,
      },
      {
        header: "Dealer Code",
        key: "dealer_code",
        width: 20,
      },

      {
        header: "Shop Name",
        key: "shop_name",
        width: 30,
      },

      {
        header: "Dealer Person",
        key: "dealer_person",
        width: 25,
      },

      {
        header: "District",
        key: "district",
        width: 20,
      },
      {
        header: "Address",
        key: "address",
        width: 40,
      },
      {
        header: "Pincode",
        key: "pincode",
        width: 15,
      },

      {
        header: "Dealer Mobile Number",
        key: "dealer_mobile_number",
        width: 20,
      },

      {
        header: "Club Millennium",
        key: "club_millennium",
        width: 20,
      },

      {
        header: "Sales Name",
        key: "sales_spoc_name",
        width: 25,
      },

      {
        header: "Sales Email",
        key: "sales_spoc_email",
        width: 30,
      },

      {
        header: "Sales Contact Number",
        key: "sales_spoc_contact",
        width: 20,
      },

      {
        header: "Trade Name",
        key: "trade_name",
        width: 25,
      },

      {
        header: "Trade Email",
        key: "trade_email",
        width: 30,
      },

      {
        header: "Trade Contact Number",
        key: "trade_contact",
        width: 20,
      },
    ];

    // ADD ROWS
    dealers.forEach((dealer) => {
      worksheet.addRow({
        dealer_code: dealer.dealer_code,

        shop_name: dealer.shop_name,

        dealer_person: dealer.dealer_person,

        state: dealer.state,

        district: dealer.district,

        dealer_mobile_number: dealer.dealer_mobile_number,

        pincode: dealer.pincode,

        address: dealer.address,

        club_millennium: dealer.club_millennium || "",

        sales_spoc_name: dealer.SalesSpocs?.[0]?.name || "",

        sales_spoc_email: dealer.SalesSpocs?.[0]?.email || "",

        sales_spoc_contact: dealer.SalesSpocs?.[0]?.contact_number || "",

        trade_name: dealer.TradeMarketingSpocs?.[0]?.name || "",

        trade_email: dealer.TradeMarketingSpocs?.[0]?.email || "",

        trade_contact: dealer.TradeMarketingSpocs?.[0]?.contact_number || "",
      });
    });

    // RESPONSE HEADERS
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=dealer-list.xlsx",
    );

    // DOWNLOAD FILE
    await workbook.xlsx.write(res);

    res.end();
  } catch (error) {
    console.log("Download Dealer Excel Error:", error);

    req.flash("error", "Error downloading excel");

    return res.redirect("/admin/dealerlist");
  }
};

export const rejectDealerImage = async (req, res) => {
  try {
    const { image_id, reject_reason } = req.body;

    // =========================
    // VALIDATION
    // =========================

    if (!image_id) {
      return res.status(400).json({
        success: false,

        message: "Image ID required",
      });
    }

    if (!reject_reason) {
      return res.status(400).json({
        success: false,

        message: "Reject reason required",
      });
    }

    // =========================
    // FIND IMAGE
    // =========================

    const image = await Dealer.findOne({
      where: {
        id: id,
      },

      include: [
        {
          model: Dealer,
        },
      ],
    });

    if (!image) {
      return res.status(404).json({
        success: false,

        message: "Image not found",
      });
    }

    // =========================
    // UPDATE IMAGE STATUS
    // =========================

    image.status = "rejected";

    image.reject_reason = reject_reason;

    await image.save();

    // =========================
    // MOBILE NUMBER
    // =========================

    // let mobile =
    //   numbers ||
    //   image.Dealer
    //     ?.dealer_mobile_number;

    // if (!mobile) {

    //   return res.status(400).json({

    //     success: false,

    //     message:
    //       "Dealer mobile number not found",
    //   });
    // }

    // CLEAN NUMBER

    // =========================
    // SMS MESSAGE
    // =========================
    // const otp = 898787;
    //     const message =
    //       `Welcome to Nuvoco Super Women Sangini! Your OTP is ${otp}. STRMCM`;
    //     // const message =
    //     //   `Welcome to Nuvoco Super Women Sangini! Your image has been rejected due to ${reject_reason}. STRMCM`;

    //     console.log(
    //       "MESSAGE =>",
    //       message
    //     );

    // =========================
    // SAME FORMAT AS OTP API
    // =========================

    const params = {
      APIKey: process.env.SMS_API_KEY,

      senderid: process.env.SMS_SENDER_ID,

      channel: "Trans",

      DCS: 0,

      flashsms: 0,

      number: "91" + mobile,

      text: message,

      DLTTemplateId: process.env.SMS_TEMPLATE_ID,

      route: 0,

      PEId: process.env.SMS_PE_ID,
    };

    console.log("SMS PARAMS =>", params);

    // =========================
    // SEND SMS
    // =========================

    const response = await axios.get(
      process.env.SMS_BASE_URL,

      { params },
    );

    console.log("SMS RESPONSE =>", response.data);

    // =========================
    // SUCCESS RESPONSE
    // =========================

    return res.status(200).json({
      success: true,

      message: "Image rejected and SMS sent successfully",

      sms_response: response.data,
    });
  } catch (error) {
    console.log(
      "Reject Dealer Image Error =>",
      error.response?.data || error.message,
    );

    return res.status(500).json({
      success: false,

      message: error.response?.data || error.message,
    });
  }
};

export const submitFinalSelectedImage = async (req, res) => {
  try {
    const { dealer_id, selected_image } = req.body;

    if (!selected_image) {
      req.flash("error", "Please select image");

      return res.redirect(`dealer-image/${dealer_id}`);
    }

    // Check already exists
    const existing = await DealerFinalImage.findOne({
      where: { dealer_id },
    });

    if (existing) {
      // Update existing
      await existing.update({
        image_id: selected_image,
      });
    } else {
      // Create new
      await DealerFinalImage.create({
        dealer_id,
        image_id: selected_image,
      });
    }

    // Update dealer status
    await Dealer.update(
      {
        imageStatus: "approved",
      },
      {
        where: { id: dealer_id },
      },
    );

    req.flash("success", "Final image selected successfully");

    return res.redirect(`dealer-image/${dealer_id}`);
  } catch (err) {
    console.log(err);

    req.flash("error", "Error while selecting image");

    return res.redirect(`dealer-image/${dealer_id}`);
  }
};

export const rejectDealerImages = async (req, res) => {
  const { dealer_id } = req.body;
  try {
    if (!dealer_id) {
      req.flash("error", "Dealer ID required");

      return res.redirect("back");
    }

    const dealer = await Dealer.findOne({
      where: {
        id: dealer_id,
      },
    });

    if (!dealer) {
      req.flash("error", "Dealer not found");

      return res.redirect("back");
    }

    dealer.imageStatus = "rejected";

    await dealer.save();

    await DealerFinalImage.destroy({
      where: {
        dealer_id,
      },
    });

    const mobile = dealer.dealer_mobile_number;

    // =========================
    // SEND SMS
    // =========================

    // if (mobile) {
    //   const message = `Welcome to Nuvoco Super Women Sangini! Your OTP is . STRMCM`;

    //   const params = {
    //     APIKey: process.env.SMS_API_KEY,

    //     senderid: process.env.SMS_SENDER_ID,

    //     channel: "Trans",

    //     DCS: 0,

    //     flashsms: 0,

    //     number: "91" + mobile,

    //     text: message,

    //     DLTTemplateId: process.env.SMS_TEMPLATE_ID,

    //     route: 0,

    //     PEId: process.env.SMS_PE_ID,
    //   };

    //   console.log("SMS PARAMS =>", params);

    //   const response = await axios.get(process.env.SMS_BASE_URL, { params });

    //   console.log("SMS RESPONSE =>", response.data);
    // }

    // =========================
    // SUCCESS
    // =========================

    req.flash("success", "Dealer images rejected successfully");

    return res.redirect(`dealer-image/${dealer_id}`);
  } catch (err) {
    console.log(
      "Reject Dealer Images Error =>",
      err.response?.data || err.message,
    );

    req.flash("error", "Error while rejecting dealer images");

    return res.redirect(`dealer-image/${dealer_id}`);
  }
};

export const renderDownloadDealerImage = async (req, res) => {
  try {
    const dealers = await Dealer.findAll({ raw: true });
    console.log("region vide", dealers.slice(0, 5));
    res.render("admin/download-image", { data: dealers });
  } catch (err) {
    console.log("error in geting dealer list", err.response);
  }
};

export const getDealerFinalImage = async (req, res) => {
  try {
    const { dealer_code } = req.body;

    // =========================
    // FIND DEALER
    // =========================

    const dealer = await Dealer.findOne({
      where: {
        dealer_code,
      },
    });

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer not found",
      });
    }

    // =========================
    // FIND FINAL IMAGE
    // =========================

    const finalImage = await DealerFinalImage.findOne({
      where: {
        dealer_id: dealer.id,
      },

      include: [
        {
          model: DealerImage,
          attributes: ["image"],
        },
      ],
    });

    if (!finalImage) {
      return res.status(404).json({
        success: false,
        message: "No final image found for dealer",
      });
    }

    return res.status(200).json({
      success: true,

      data: {
        dealer_name: dealer.shop_name,

        dealer_code: dealer.dealer_code,

        image: finalImage.DealerImage.image,
      },
    });
  } catch (err) {
    console.log("Error in getDealerFinalImage", err);

    return res.status(500).json({
      success: false,
      message: "Error in fetching dealer image",
    });
  }
};
