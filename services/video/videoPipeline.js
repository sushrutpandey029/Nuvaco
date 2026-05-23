import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { generateNameAudio } from "./elevenLabsService.js";
import { spliceNameIntoVideo, cleanupTempFile } from "./videoProcessor.js";
import MessageModel from "../../Model/dealer/MessageModel.js";
import CachedVideo from "../../Model/dealer/CachedVideoModel.js";
import RegionVideo from "../../Model/regionVideoModel.js";

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../.."); // services/video se 2 level upar = project root

export const getPersonalizedVideo = async (dealer) => {
    console.log("dealerin person", dealer);
    const { id: dealerId, name: dealerName, state } = dealer;
console.log("dealer id in gpv",dealerId,dealerName,state)
    // Cache check
    const cached = await CachedVideo.findOne({
        where: { dealer_id: dealerId, status: "ready" },
    });
    console.log("cached in vido piplein",cached)

    if (cached) {
        const absPath = path.join(ROOT, "public", cached.video_path);
        if (fs.existsSync(absPath)) {
            console.log(`✅ Cache hit — dealer ${dealerId} (${dealerName})`);
            return cached.video_path;
        }
        await cached.destroy();
    }

    // MessageModel se voice config lo
    console.log("state befreo mesag model",state)
    let messageConfig = await MessageModel.findOne({ where: { state } });
console.log("message config",messageConfig)
    if (!messageConfig) {
        console.warn(`No config for state: ${state}, trying default...`);
        messageConfig = await MessageModel.findOne({ where: { state: "default" } });
    }

    if (!messageConfig) {
        console.warn("No message config found in DB");
        return null;
    }

    // RegionVideo table se latest video lo
    const regionVideo = await RegionVideo.findOne({
        where: { state },
        order: [["createdAt", "DESC"]],
    });

    if (!regionVideo) {
        console.warn("No video found in region_videos for state:", state);
        return null;
    }

    // regionConfig banao — voice config + dynamic video path
    const regionConfig = {
        ...messageConfig.dataValues,
        video_path: regionVideo.video.replace(/\\/g, "/"),
    };

    console.log("🎬 Video path from RegionVideo:", regionConfig.video_path);

    // ✅ FIX — public ke bina path check karo (uploads/ directly project root mein hai)
    const baseVideoCheck = path.join(ROOT, regionConfig.video_path);
    console.log("🎬 Full video abs path:", baseVideoCheck);
    console.log("🎬 File exists?", fs.existsSync(baseVideoCheck));

    const existing = await CachedVideo.findOne({ where: { dealer_id: dealerId } });
    if (existing?.status === "processing") {
        console.log(`Already processing for dealer ${dealerId}`);
        return null;
    }

    // Voice clone nahi hua toh auto clone karo
    if (!regionConfig.elevenlabs_voice_id) {
        console.log(`No voice ID for state ${state} — auto cloning...`);
        try {
            await autoCloneVoice(regionConfig, messageConfig);
            await messageConfig.reload();
            regionConfig.elevenlabs_voice_id = messageConfig.elevenlabs_voice_id;
        } catch (err) {
            console.error("Auto clone failed:", err.message);
            return regionConfig.video_path;
        }
    }

    // Timestamp check
    if (regionConfig.name_timestamp === null || regionConfig.name_timestamp === undefined) {
        console.warn("No timestamp set — returning base video");
        return regionConfig.video_path;
    }

    // Processed video path banao
    const processedVideoName = `dealer_${dealerId}_${Date.now()}.mp4`;
    const processedVideoPath = `/uploads/processed/${processedVideoName}`;

    if (existing) {
        await existing.update({ status: "processing", video_path: processedVideoPath });
    } else {
        await CachedVideo.create({
            dealer_id: dealerId,
            dealer_name: dealerName,
            state: state || "default",
            video_path: processedVideoPath,
            status: "processing",
        });
    }

    processInBackground(dealerId, dealerName, regionConfig, processedVideoPath);

    return null;
};

// ✅ autoCloneVoice — video path public ke bina
const autoCloneVoice = async (regionConfig, messageConfig) => {
    console.log("🔵 autoCloneVoice START — state:", regionConfig.state);
    console.log("🔵 Video path:", regionConfig.video_path);

    const { cloneVoice } = await import("./elevenLabsService.js");

    // ✅ FIX — public nahi lagana, uploads/ directly ROOT mein hai
    const baseVideoAbs = path.join(ROOT, regionConfig.video_path);
    console.log("🔵 Full path:", baseVideoAbs);
    console.log("🔵 Video file exists?", fs.existsSync(baseVideoAbs));

    // audio output public/uploads/audio mein save karo
    const audioExtractPath = path.join(
        ROOT, "public", "uploads", "audio",
        `clone_${regionConfig.state}_${Date.now()}.mp3`
    );

    // ✅ YEH ADD KARO — folder nahi hai toh banao
    fs.mkdirSync(path.join(ROOT, "public", "uploads", "audio"), { recursive: true });
    fs.mkdirSync(path.join(ROOT, "public", "uploads", "processed"), { recursive: true });

    try {
        await execAsync(
            `ffmpeg -i "${baseVideoAbs}" -vn -ar 44100 -ac 2 -b:a 192k "${audioExtractPath}" -y`
        );
        console.log("🔵 Audio extracted successfully");
    } catch (ffmpegErr) {
        console.error("❌ FFmpeg extract failed:", ffmpegErr.message);
        throw ffmpegErr;
    }

    console.log("🎙️ Cloning voice for state:", regionConfig.state);

    try {
        const voiceId = await cloneVoice(
            `${regionConfig.state} State Head`,
            audioExtractPath
        );
        await messageConfig.update({ elevenlabs_voice_id: voiceId });
        console.log("✅ Voice cloned! ID:", voiceId);
        cleanupTempFile(audioExtractPath);
    } catch (cloneErr) {
        console.error("❌ ElevenLabs clone failed:", cloneErr.response?.data || cloneErr.message);
        throw cloneErr;
    }
};

const processInBackground = async (
    dealerId, dealerName, regionConfig, processedVideoPath
) => {
    console.log("🟡 processInBackground START");
    console.log("🟡 dealerName:", dealerName);
    console.log("🟡 voice_id jo use hoga:", regionConfig.elevenlabs_voice_id || process.env.ELEVENLABS_VOICE_ID);
    console.log("🟡 voice source:", regionConfig.elevenlabs_voice_id ? "✅ CLONED" : "⚠️ ENV DEFAULT");
    console.log("🟡 base video:", regionConfig.video_path);

    const audioPath = path.join(
        ROOT, "public", "uploads", "audio",
        `temp_${dealerId}_${Date.now()}.mp3`
    );

    // ✅ FIX — base video public ke bina, processed output public mein
    const baseVideoAbsPath = path.join(ROOT, regionConfig.video_path);
    const outputAbsPath = path.join(ROOT, "public", processedVideoPath);

    console.log("🟡 baseVideoAbsPath:", baseVideoAbsPath);
    console.log("🟡 outputAbsPath:", outputAbsPath);

    try {
        const prefix = regionConfig.name_prefix || "";
        const suffix = regionConfig.name_suffix || " ji";
        const speakText = `${prefix}${dealerName}${suffix}`.trim();

        console.log(`Generating audio: "${speakText}" for dealer ${dealerId}`);

        await generateNameAudio(
            speakText,
            regionConfig.elevenlabs_voice_id || process.env.ELEVENLABS_VOICE_ID,
            audioPath
        );

        console.log(`Splicing video for dealer ${dealerId}...`);

        await spliceNameIntoVideo(
            baseVideoAbsPath,
            audioPath,
            regionConfig.name_timestamp,
            outputAbsPath
        );

        await CachedVideo.update(
            { status: "ready", video_path: processedVideoPath },
            { where: { dealer_id: dealerId } }
        );

        console.log(`✅ Video ready: dealer ${dealerId} — ${processedVideoPath}`);

    } catch (err) {
        console.error(`Pipeline failed for dealer ${dealerId}:`, err.message);
        await CachedVideo.update(
            { status: "failed" },
            { where: { dealer_id: dealerId } }
        );
    } finally {
        cleanupTempFile(audioPath);
    }
};

export const getVideoStatus = async (dealerId) => {
    const record = await CachedVideo.findOne({ where: { dealer_id: dealerId } });
    if (!record) return { status: "not_started" };
    return {
        status: record.status,
        videoPath: record.status === "ready" ? record.video_path : null,
    };
};

export const invalidateDealerCache = async (dealerId) => {
    const record = await CachedVideo.findOne({ where: { dealer_id: dealerId } });
    if (record) {
        cleanupTempFile(path.join(ROOT, "public", record.video_path));
        await record.destroy();
        console.log(`Cache cleared: dealer ${dealerId}`);
    }
};

export const invalidateRegionCache = async (state) => {
    const records = await CachedVideo.findAll({ where: { state } });
    for (const r of records) {
        cleanupTempFile(path.join(ROOT, "public", r.video_path));
    }
    await CachedVideo.destroy({ where: { state } });
    console.log(`Cache cleared: state ${state}`);
};