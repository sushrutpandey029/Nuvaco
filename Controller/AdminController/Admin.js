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
    console.log("insied admin logn conteooler");
    console.log("req body in admin logi", req.body);
    const { email, password } = req.body;
    const captcha = req.body["g-recaptcha-response"];

    // ✅ 1. Basic validation
    if (!email || !password) {
      req.flash("error", "Email and Password are required");
      return res.redirect("login");
    }
    console.log("after base alidiaiotn");
    // ✅ 2. Captcha check
    if (!captcha) {
      req.flash("error", "Please verify captcha");
      return res.redirect("login");
    }
    console.log("after captcha");

    // ✅ 3. Verify captcha from Google
    const response = await axios.post(process.env.VERIFY_CAPTCHA_URL, null, {
      params: {
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: captcha,
      },
    });
    console.log("after recaptcha");

    if (!response.data.success) {
      req.flash("error", "Captcha verification failed");
      return res.redirect("login");
    }

    // ✅ 4. Check admin
    const admin = await AdminModel.findOne({ where: { email } });
    console.log("admin", admin);

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

    console.log("session data of adkin", req.session.admin);

    // ✅ 7. Redirect
    return res.redirect("dashboard");
  } catch (error) {
    console.error(error);
    req.flash("error", "Something went wrong");
    return res.redirect("login");
  }
};

export const adminDashboard = async (req, res) => {
  const admin = req.session.admin;
  if (!admin) {
    return res.redirect("login");
  }
  console.log("admin in dashobar", admin);
  res.render("admin/dashboard", { admin });
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
    // req.session.admin = "";

    res.clearCookie("connect.sid");

    return res.redirect("/admin/login");
  });
};

export const adminProfile = async (req, res) => {
  const admin = req.session.admin;
  if (!admin) {
    return res.redirect("login");
  }
  console.log("admin in dashobar", admin);
  res.render("admin/adminprofile", { admin });
};

// export const dealerList = async (req, res) => {
//   const admin = req.session.admin;
//   if (!admin) {
//     return res.redirect("login")
//   }
//   console.log("admin in dashobar", admin);
//   res.render("admin/dealerList", { admin });
// };

export const dealerList = async (req, res) => {
  try {
    const admin = req.session.admin;
    if (!admin) return res.redirect("login");

    console.log("📥 Query Params:", req.query);

    let { page = 1, limit = 10, search = "" } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;

    if (page < 1) page = 1;
    if (limit < 1) limit = 10;

    search = search.trim();

    console.log("📊 Parsed:", { page, limit, search });

    const offset = (page - 1) * limit;

    const whereCondition = search
      ? {
          fullname: {
            [Op.like]: `%${search}%`,
          },
        }
      : {};

    console.log("🔍 Where Condition:", whereCondition);

    const { count, rows } = await Dealer.findAndCountAll({
      where: whereCondition,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    console.log("📦 Count:", count);
    console.log("📄 Rows Length:", rows.length);

    if (rows.length > 0) {
      console.log("👤 First Dealer:", rows[0].toJSON());
    }

    if (req.xhr || req.headers.accept?.includes("json")) {
      return res.status(200).json({
        success: true,
        total: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        data: rows || [],
      });
    }

    return res.render("admin/dealerList", {
      admin,
      dealers: rows || [],
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      search,
    });
  } catch (error) {
    console.error("❌ Dealer List Error:", error);
    return res.status(500).send("Server Error");
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
  console.log("admin in dashobar", admin);
  res.render("admin/dealerDetail", { admin });
};

export const dealerRegister = async (req, res) => {
  const admin = req.session.admin;
  if (!admin) {
    return res.redirect("login");
  }
  console.log("admin in dashobar", admin);
  res.render("admin/registerDealer", { admin });
};

export const videoMessage = async (req, res) => {
  const admin = req.session.admin;
  if (!admin) {
    return res.redirect("login");
  }
  res.render("admin/video-message", { admin,states });
};

// export const uploadRegionVideo = async (req, res) => {
//   try {
//     console.log("BODY =>", req.body);
//     console.log("FILE =>", req.file);

//     const { region } = req.body;
//     console.log("req body",req.body)

//     if (!region) {
//       return res.status(400).json({
//         success: false,
//         message: "Region required",
//       });
//     }

//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: "Video file required",
//       });
//     }

//     const saveData = await RegionVideo.create({
//       region,
//       video: req.file.path,
//     });

//     return res.status(201).json({
//       success: true,
//       message: "Video uploaded",
//       data: saveData,
//     });
//   } catch (error) {
//     console.log("ERROR =>", error);

//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };


export const uploadRegionVideo = async (req, res) => {
  try {
    console.log("BODY =>", req.body);
    console.log("FILE =>", req.file);

    const { region } = req.body;

    // ❌ Validation
    if (!region) {
      req.flash("error", "Region required");
      return res.redirect("videomessage");
    }

    if (!req.file) {
      req.flash("error", "Video file required");
      return res.redirect("videomessage");
    }

    // ✅ Save data
    const saveData = await RegionVideo.create({
      region,
      video: req.file.path,
    });

    // ✅ Success message
    req.flash("success", "Video uploaded successfully");
    return res.redirect("videomessage"); // or specific page

  } catch (error) {
    console.log("ERROR =>", error);

    req.flash("error", "Something went wrong");
    return res.redirect("videomessage");
  }
};
export const registerDealer = async (req, res) => {
  try {
    const {
      state,
      dealer_code,
      shop_name,
      dealer_person,
      district,
      address,
      pincode,
      dealer_mobile_number,

      sales_spoc,

      trade_marketing_spoc,
    } = req.body;

    // Create Dealer
    const dealer = await Dealer.create({
      state,
      dealer_code,
      shop_name,
      dealer_person,
      district,
      address,
      pincode,
      dealer_mobile_number,
    });

    // Create Sales SPOC
    await SalesSpoc.create({
      dealer_id: dealer.id,
      name: sales_spoc.name,
      email: sales_spoc.email,
      contact_number: sales_spoc.contact_number,
    });

    // Create Trade Marketing SPOC
    await TradeMarketingSpoc.create({
      dealer_id: dealer.id,
      name: trade_marketing_spoc.name,
      email: trade_marketing_spoc.email,
      contact_number: trade_marketing_spoc.contact_number,
    });

    return res.status(201).json({
      success: true,
      message: "Dealer registered successfully",
      dealer_id: dealer.id,
    });
  } catch (error) {
    console.log("Registration Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// export const uploadDealersExcel = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: "Excel file is required",
//       });
//     }

//     const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
//     const sheetName = workbook.SheetNames[0];
//     const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

//     if (!sheetData.length) {
//       return res.status(400).json({
//         success: false,
//         message: "Excel file is empty",
//       });
//     }

//     let successCount = 0;
//     let failedRows = [];

//     for (let i = 0; i < sheetData.length; i++) {
//       const row = sheetData[i];

//       try {
//         const { dealer_name, dealer_email, dealer_contact, region } = row;

//         if (!dealer_name || !dealer_email || !dealer_contact || !region) {
//           failedRows.push({ row: i + 2, error: "Missing fields" });
//           continue;
//         }

//         const exists = await Dealer.findOne({
//           where: { dealer_email },
//         });

//         if (exists) {
//           failedRows.push({
//             row: i + 2,
//             error: "Email already exists",
//           });
//           continue;
//         }

//         await Dealer.create({
//           dealer_name,
//           dealer_email,
//           dealer_contact,
//           region,
//         });

//         successCount++;
//       } catch (err) {
//         failedRows.push({
//           row: i + 2,
//           error: err.message,
//         });
//       }
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Excel processed",
//       inserted: successCount,
//       failed: failedRows,
//     });
//   } catch (error) {
//     console.error("Excel Upload Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };

export const uploadDealersExcel = async (req, res) => {
  try {
    // Check file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Excel file required",
      });
    }

    // Read excel
    const workbook = XLSX.readFile(req.file.path);

    const sheetName = workbook.SheetNames[0];

    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let uploaded = 0;

    let skipped = 0;

    // Loop rows
    for (const row of sheetData) {
      console.log(row);

      // Duplicate check
      const existingDealer = await Dealer.findOne({
        where: {
          dealer_code: row.dealer_code,
        },
      });

      if (existingDealer) {
        skipped++;

        continue;
      }

      // Create Dealer
      const dealer = await Dealer.create({
        state: row.state,

        dealer_code: row.dealer_code,

        shop_name: row.shop_name,

        dealer_person: row.dealer_person,

        district: row.district,

        address: row.address,

        pincode: row.pincode,

        dealer_mobile_number: row.dealer_mobile_number,
      });

      console.log("Dealer Created:", dealer.id);

      // Create Sales SPOC
      const salesData = await SalesSpoc.create({
        dealer_id: dealer.id,

        name: row.sales_name,

        email: row.sales_email,

        contact_number: row.sales_contact_number,
      });

      console.log("Sales SPOC Created:", salesData.id);

      // Create Trade Marketing SPOC
      const tradeData = await TradeMarketingSpoc.create({
        dealer_id: dealer.id,

        name: row.trade_name,

        email: row.trade_email,

        contact_number: row.trade_contact_number,
      });

      console.log("Trade SPOC Created:", tradeData.id);

      uploaded++;
    }

    return res.status(201).json({
      success: true,

      message: "Excel uploaded successfully",

      uploaded,

      skipped,
    });
  } catch (error) {
    console.log("Excel Upload Error:", error);

    return res.status(500).json({
      success: false,

      message: error.message,
    });
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
