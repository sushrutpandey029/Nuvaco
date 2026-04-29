import axios from "axios";
import Dealer from "../../Model/dealerModel.js";
import DealerOTP from "../../Model/dealer/dealerOtp.js";

export const renderHome = async (req, res) => {
  const dealer = req.session.dealer;
  if (!dealer) {
    return res.render("dealer/auth/dealerLogin");
  }
  console.log("dealer in dashobar", dealer);
  res.render("dealer/auth/home", { dealer });
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
    console.log("response of send otp", response);
    return response.data ? true : false;
  } catch (error) {
    console.log("SMS Error:", error.message);
    return false;
  }
};

export const sendOTP = async (req, res) => {
  console.log("send otp called");
  try {
    console.log("req body", req.body);
    const { contact } = req.body;
    console.log("contact", contact);
    if (!contact) {
      return res.json({ success: false, message: "contact required" });
    }

    // ✅ Check dealer exists
    const dealer = await Dealer.findOne({
      where: { contact: contact },
    });

    console.log("dealer", dealer);
    if (!dealer) {
      return res.json({ success: false, message: "Dealer not found" });
    }

    // ✅ Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("otp", otp);
    // ✅ Expiry 2 minutes
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
    console.log("expiresAt", expiresAt);
    // ✅ Delete old OTP (optional but clean)
    await DealerOTP.destroy({ where: { contact } });
    console.log("after destroy");
    // ✅ Save new OTP
    await DealerOTP.create({
      contact,
      otp,
      expiresAt,
    });
    console.log("befreo sms send");
    // ✅ Send SMS
    const smsSent = await sendSmsOtp(contact, otp);
    console.log("smsendt", smsSent);
    if (!smsSent) {
      return res.json({ success: false, message: "Failed to send OTP" });
    }

    return res.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (err) {
    console.log(err);
    return res.json({ success: false, message: "Something went wrong" });
  }
};

// private function sendSmsOtp($mobile, $otp)
//     {
//         $message = "Welcome to Nuvoco Super Women Sangini! Your OTP is $otp. STRMCM";

//         $url = "https://cloud.smsindiahub.in/api/mt/SendSMS?" . http_build_query([
//             'APIKey'        => 'ElM4vhB6lk6zLHKzbkN1CA',
//             'senderid'      => 'STRMCM',
//             'channel'       => 'Trans',
//             'DCS'           => 0,
//             'flashsms'      => 0,
//             'number'        => '91' . $mobile,
//             'text'          => $message,
//             'DLTTemplateId' => '1007870102830797429',
//             'route'         => 0,
//             'PEId'          => '1001293346151442037'
//         ]);

//         $ch = curl_init();
//         curl_setopt_array($ch, [
//             CURLOPT_URL            => $url,
//             CURLOPT_RETURNTRANSFER => true,
//             CURLOPT_TIMEOUT        => 30,
//         ]);

//         $response = curl_exec($ch);
//         curl_close($ch);

//         return !empty($response);
//     }

// ✅ Verify OTP

export const verifyOTP = async (req, res) => {
  try {
    const { contact, otp } = req.body;

    if (!contact || !otp) {
      return res.json({ success: false, message: "All fields required" });
    }

    // ✅ Find OTP record
    const otpRecord = await DealerOTP.findOne({
      where: { contact, otp },
    });

    if (!otpRecord) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    // ✅ Check expiry
    if (new Date() > otpRecord.expiresAt) {
      await DealerOTP.destroy({ where: { contact } });
      return res.json({ success: false, message: "OTP expired" });
    }

    // ✅ Find dealer
    const dealer = await Dealer.findOne({
      where: { contact: contact },
    });

    if (!dealer) {
      return res.json({ success: false, message: "Dealer not found" });
    }

    // ✅ Create session
    req.session.dealer = {
      id: dealer.id,
      name: dealer.fullname,
      contact: dealer.contact,
    };

    // ✅ Delete OTP after success
    await DealerOTP.destroy({ where: { contact } });

    return res.json({
      success: true,
      message: "Login successful",
    });
  } catch (err) {
    console.log(err);
    return res.json({ success: false, message: "Something went wrong" });
  }
};

// public function verifyOtp()
//     {
//         $enteredOtp = $this->request->getPost('otp');
//         $sessionOtp = session()->get('otp');

//         if ($enteredOtp == $sessionOtp) {
//             session()->remove('otp');

//             return redirect()->to('register');
//         }

//         return redirect()->back()
//             ->with('error', 'Invalid OTP');
//     }
