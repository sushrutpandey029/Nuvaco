import AdminModel from "../../Model/adminModel.js";
import { sendMail } from "../../utils/mailer.js";
import Dealer from "../../Model/dealerModel.js";
import XLSX from "xlsx";
import axios from "axios";
import bcrypt from "bcrypt";

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

export const adminLogout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ success: false });
    }
    req.session.admin = "";

    res.clearCookie("connect.sid");

    return res.status(200).json({ success: true });
  });
};

export const registerDealer = async (req, res) => {
  try {
    const { dealer_name, dealer_email, dealer_contact, region } = req.body;
    if (!dealer_name || !dealer_email || !dealer_contact || !region) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }
    const existingDealer = await Dealer.findOne({
      where: { dealer_email },
    });

    if (existingDealer) {
      return res.status(409).json({
        success: false,
        message: "Dealer already registered with this email",
      });
    }

    const dealer = await Dealer.create({
      dealer_name,
      dealer_email,
      dealer_contact,
      region,
    });

    return res.status(201).json({
      success: true,
      message: "Dealer registered successfully",
      data: dealer,
    });
  } catch (error) {
    console.error("Dealer Registration Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const uploadDealersExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required",
      });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!sheetData.length) {
      return res.status(400).json({
        success: false,
        message: "Excel file is empty",
      });
    }

    let successCount = 0;
    let failedRows = [];

    for (let i = 0; i < sheetData.length; i++) {
      const row = sheetData[i];

      try {
        const { dealer_name, dealer_email, dealer_contact, region } = row;

        if (!dealer_name || !dealer_email || !dealer_contact || !region) {
          failedRows.push({ row: i + 2, error: "Missing fields" });
          continue;
        }

        const exists = await Dealer.findOne({
          where: { dealer_email },
        });

        if (exists) {
          failedRows.push({
            row: i + 2,
            error: "Email already exists",
          });
          continue;
        }

        await Dealer.create({
          dealer_name,
          dealer_email,
          dealer_contact,
          region,
        });

        successCount++;
      } catch (err) {
        failedRows.push({
          row: i + 2,
          error: err.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Excel processed",
      inserted: successCount,
      failed: failedRows,
    });
  } catch (error) {
    console.error("Excel Upload Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
