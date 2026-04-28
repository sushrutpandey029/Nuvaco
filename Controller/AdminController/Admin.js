import AdminModel from "../../Model/adminModel.js"
import Dealer from "../../Model/dealerModel.js";
import { sendMail } from "../../utils/mailer.js";
import bcrypt from "bcrypt";
import XLSX from "xlsx";


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
  res.render("admin/adminLogin");
};

export const adminlogin = async (req,res) =>{
    res.send("sucesss")
}


// dealer Registration

export const registerDealer = async (req, res) => {
  try {
    const { dealer_name, dealer_email, dealer_contact, region } = req.body;

    // Validation
    if (!dealer_name || !dealer_email || !dealer_contact || !region) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Check existing email
    const existingDealer = await Dealer.findOne({
      where: { dealer_email },
    });

    if (existingDealer) {
      return res.status(409).json({
        success: false,
        message: "Dealer already registered with this email",
      });
    }

    // Create dealer
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

    // Read Excel buffer
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheetData = XLSX.utils.sheet_to_json(
      workbook.Sheets[sheetName]
    );

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

        // Validation
        if (!dealer_name || !dealer_email || !dealer_contact || !region) {
          failedRows.push({ row: i + 2, error: "Missing fields" });
          continue;
        }

        // Check duplicate email
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

        // Insert
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


export const getDealers = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const offset = (page - 1) * limit;

    // Search condition
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

