import axios from "axios";
import fs from "fs";

const ELEVEN_API = "https://api.elevenlabs.io/v1";


export const generateNameAudio = async (text, voiceId, outputPath) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set in .env");
  if (!voiceId) throw new Error("Voice ID missing");

  const response = await axios.post(
    `${ELEVEN_API}/text-to-speech/${voiceId}`,
    {
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: {
        stability: 0.35,
        similarity_boost: 0.75,
        style: 0.45,
        use_speaker_boost: true,
        speed: 0.75,  // ← yeh add karo (1.0 = normal, 0.75 = slow, 0.5 = bahut slow)
      },
    },
    {
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      responseType: "arraybuffer",
    }
  );

  fs.writeFileSync(outputPath, response.data);
  console.log(`✅ Audio saved: ${outputPath}`);
  return outputPath;
};


export const cloneVoice = async (name, audioPath) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set in .env");

  const FormData = (await import("form-data")).default;
  const form = new FormData();
  form.append("name", name);
  form.append("description", `Voice clone for ${name}`);
  form.append("files", fs.createReadStream(audioPath));

  const response = await axios.post(
    `${ELEVEN_API}/voices/add`,
    form,
    {
      headers: {
        "xi-api-key": apiKey,
        ...form.getHeaders(),
      },
    }
  );

  const voiceId = response.data.voice_id;
  console.log(`✅ Voice cloned: ${voiceId}`);
  return voiceId;
};
