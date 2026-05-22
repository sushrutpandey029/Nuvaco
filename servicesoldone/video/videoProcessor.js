import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";

const execAsync = promisify(exec);

export const spliceNameIntoVideo = async (
  baseVideoPath, nameAudioPath, nameTimestamp, outputPath
) => {

  // Original video 4sec-6sec mute hoga — dynamic naam wahan bolega
  const muteStart = nameTimestamp;      // 4 sec (DB se aata hai)
  const muteEnd = nameTimestamp + 2.0;  // 6 sec (2 second window fixed)

  const { stdout } = await execAsync(
    `ffprobe -v quiet -print_format json -show_streams "${nameAudioPath}"`
  );
  const probe = JSON.parse(stdout);
  const audioStream = probe.streams.find(s => s.codec_type === "audio");
  const nameDuration = parseFloat(audioStream?.duration || 1.5);

  // Naam audio ko 2 sec window mein fit karo
  const clampedDuration = Math.min(nameDuration, 2.0);

  console.log(`Splice: mute=${muteStart}s to ${muteEnd}s, naam duration=${nameDuration}s, clamped=${clampedDuration}s`);

  const cmd = `ffmpeg -y \
    -i "${baseVideoPath}" \
    -i "${nameAudioPath}" \
    -filter_complex "\
      [0:a]volume=enable='between(t,${muteStart},${muteEnd})':volume=0[base_muted];\
      [1:a]atrim=0:${clampedDuration},asetpts=PTS-STARTPTS,adelay=${Math.round(muteStart * 1000)}|${Math.round(muteStart * 1000)}[name_delayed];\
      [base_muted][name_delayed]amix=inputs=2:duration=first:dropout_transition=0[final_audio]\
    " \
    -map 0:v \
    -map "[final_audio]" \
    -c:v copy \
    -c:a aac \
    -b:a 192k \
    -shortest \
    "${outputPath}"`;

  await execAsync(cmd);
  console.log(`✅ Video spliced: ${outputPath}`);
  return outputPath;
};

export const cleanupTempFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Deleted: ${filePath}`);
    }
  } catch (err) {
    console.warn("Cleanup warning:", err.message);
  }
};