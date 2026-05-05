import axios from "axios";
import FormData from "form-data";

export const removeBackground = async (buffer) => {
  const formData = new FormData();
  formData.append("image_file", buffer);

  const response = await axios.post(
    "https://api.remove.bg/v1.0/removebg",
    formData,
    {
      headers: {
        ...formData.getHeaders(),
        "X-Api-Key": process.env.REMOVE_BG_API_KEY,
      },
      responseType: "arraybuffer",
    },
  );
  console.log("resp of remove bg in remvobd", response.data);

  return response.data;
};
