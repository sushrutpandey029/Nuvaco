import axios from "axios";
import FormData from "form-data";

export const removeBackground = async (buffer) => {
  console.log("in revmoc bg");
  const formData = new FormData();
  formData.append("image_file", buffer);
  console.log("after apend file");

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

  return response.data;
};
