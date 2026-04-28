import AdminModel from "../../Model/adminModel.js"
import { sendMail } from "../../utils/mailer.js";
import Dealer from "../../Model/dealerModel.js";
import bcrypt from "bcrypt"


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

export const adminlogin = async (req, res) => {
  res.render("admin/dashboard");
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