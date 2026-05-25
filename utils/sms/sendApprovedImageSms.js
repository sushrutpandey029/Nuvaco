import axios from "axios";

export const sendApprovedImageSms = async (dealer_mobile_number) => {
  console.log("deale rmobie nmber in snd smsm prroec", dealer_mobile_number);
  try {
    const message = `Thank you for uploading your photograph and becoming a part of the Mera Bharosa Program. Your personalised standee is currently being prepared and will be delivered to you soon. For any queries or further information, please contact your Nuvoco Representative. STRMCM`;

    const params = {
      APIKey: process.env.SMS_API_KEY,

      senderid: process.env.SMS_SENDER_ID,

      channel: "Trans",

      DCS: 0,

      flashsms: 0,

      number: "91" + dealer_mobile_number,

      text: message,

      DLTTemplateId: process.env.SMS_APPROVED_TEMPLATE_ID,

      route: 0,

      PEId: process.env.SMS_PE_ID,
    };

    const response = await axios.get(process.env.SMS_BASE_URL, { params });
    console.log("resp of snd sms apprv", response.data);

    return response.data ? true : false;
  } catch (error) {
    console.log("Approved SMS Error:", error.message);

    return false;
  }
};
