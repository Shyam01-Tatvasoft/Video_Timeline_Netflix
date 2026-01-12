const express = require("express");
const cors = require("cors");
const ffmpeg = require("fluent-ffmpeg");
const ffprobe = require("ffprobe-static");
const fs = require("fs");
const path = require("path");

ffmpeg.setFfprobePath(ffprobe.path);

const app = express();
app.use(cors());

const VIDEO_PATH = "videos/sample.mp4";
const OUTPUT = "output";
const THUMBS = `${OUTPUT}/thumbs`;
const SPRITES = `${OUTPUT}/sprites`;
const METADATA = `${OUTPUT}/metadata`;

const CONFIG = {
  interval: 2,
  thumbWidth: 160,
  thumbHeight: 90,
  columns: 5,
  rows: 5,
};

[OUTPUT, THUMBS, SPRITES, METADATA].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use("/sprites", express.static(SPRITES));
app.use("/metadata", express.static(METADATA));

/* ------------------ HELPERS ------------------ */

function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, data) => {
      if (err) reject(err);
      else resolve(data.format.duration);
    });
  });
}

/* ------------------ MAIN PIPELINE ------------------ */
app.get("/process-video", async (_, res) => {
  try {
    const { interval, thumbWidth, thumbHeight, columns, rows } = CONFIG;

    const thumbsPerSprite = columns * rows;

    /* ---------- 1. VIDEO DURATION ---------- */
    const duration = await getVideoDuration(VIDEO_PATH);
    console.log(`Video duration: ${duration}s`);

    /* ---------- 2. GENERATE THUMBNAILS ---------- */
    console.log("Generating thumbnails...");
    await new Promise((resolve, reject) => {
      ffmpeg(VIDEO_PATH)
        .output(path.join(THUMBS, "thumb-%04d.jpg"))
        .outputOptions([
          `-vf fps=1/${interval},scale=${thumbWidth}:${thumbHeight}`,
          "-q:v",
          "2",
          "-y",
        ])
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    /* ---------- 3. READ THUMBS ---------- */
    const thumbs = fs
      .readdirSync(THUMBS)
      .filter((f) => f.endsWith(".jpg"))
      .sort();

    const totalThumbs = thumbs.length;
    console.log(`Generated ${totalThumbs} thumbnails`);

    if (!totalThumbs) throw new Error("No thumbnails generated");

    const spriteCount = Math.ceil(totalThumbs / thumbsPerSprite);
    console.log(`Will create ${spriteCount} sprite(s)`);

    const spritesMeta = [];

    /* ---------- 4. GENERATE SPRITES (FIXED) ---------- */
    for (let i = 0; i < spriteCount; i++) {
      const startIndex = i * thumbsPerSprite;
      const endIndex = Math.min(startIndex + thumbsPerSprite, totalThumbs);
      const frames = endIndex - startIndex;

      const spriteRows = Math.ceil(frames / columns);
      const spriteFile = `sprite-${i}.jpg`;

      console.log(
        `Creating sprite ${i + 1}/${spriteCount} with ${frames} frames...`
      );

      // Create a text file listing the specific thumbnails for this sprite
      const fileListPath = path.join(THUMBS, `list-${i}.txt`);
      const fileList = [];

      for (let j = startIndex; j < endIndex; j++) {
        fileList.push(`file '${thumbs[j]}'`);
      }

      fs.writeFileSync(fileListPath, fileList.join("\n"));

      // Use concat demuxer with the file list
      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(fileListPath)
          .inputOptions(["-f", "concat", "-safe", "0"])
          .outputOptions(["-vf", `tile=${columns}x${spriteRows}`, "-y"])
          .save(path.join(SPRITES, spriteFile))
          .on("end", () => {
            fs.unlinkSync(fileListPath); // Clean up temp file
            resolve();
          })
          .on("error", (err) => {
            if (fs.existsSync(fileListPath)) {
              fs.unlinkSync(fileListPath);
            }
            reject(err);
          });
      });

      spritesMeta.push({
        url: `/sprites/${spriteFile}`,
        startIndex,
        frames,
        columns,
        rows: spriteRows,
      });
    }

    /* ---------- 5. METADATA ---------- */
    const metadata = {
      duration,
      interval,
      thumbWidth,
      thumbHeight,
      totalThumbs,
      thumbsPerSprite,
      sprites: spritesMeta,
    };

    fs.writeFileSync(
      path.join(METADATA, "preview.json"),
      JSON.stringify(metadata, null, 2)
    );

    console.log("Processing complete!");
    console.log(`Metadata saved to: ${path.join(METADATA, "preview.json")}`);

    res.json({ success: true, metadata });
  } catch (err) {
    console.error("Processing failed:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});
// app.get("/process-video", async (_, res) => {
//   try {
//     const duration = await getVideoDuration(VIDEO_PATH);
//     const totalThumbs = Math.ceil(duration / CONFIG.interval);
//     const thumbsPerSprite = CONFIG.columns * CONFIG.rows;
//     const spriteCount = Math.ceil(totalThumbs / thumbsPerSprite);

//     // STEP 1: Generate thumbnails
//     await new Promise((resolve,reject) => {
//       ffmpeg(VIDEO_PATH)
//         .output(`${THUMBS}/thumb-%04d.jpg`)
//         .outputOptions([
//           `-vf fps=1/${CONFIG.interval},scale=${CONFIG.thumbWidth}:${CONFIG.thumbHeight}`
//         ])
//         .on("end", resolve)
//         .on("error", reject)
//         .run();
//     });

//     // STEP 2: Generate sprites
//     const spritesMeta = [];

//     for (let i = 0; i < spriteCount; i++) {
//       const start = i * thumbsPerSprite + 1;
//       const spriteFile = `sprite-${i}.jpg`;

//       await new Promise((resolve,reject) => {
//         ffmpeg()
//           .input(`${THUMBS}/thumb-%04d.jpg`)
//           .inputOptions([`-start_number ${start}`])
//           .outputOptions([
//             `-frames:v ${thumbsPerSprite}`,
//             `-vf tile=${CONFIG.columns}x${CONFIG.rows}`
//           ])
//           .save(`${SPRITES}/${spriteFile}`)
//           .on("end", resolve)
//           .on("error", reject);
//       });

//       spritesMeta.push({
//         url: `/sprites/${spriteFile}`,
//         startIndex: i * thumbsPerSprite,
//         columns: CONFIG.columns,
//       });
//     }

//     // STEP 3: Metadata
//     const metadata = {
//       duration,
//       interval: CONFIG.interval,
//       thumbWidth: CONFIG.thumbWidth,
//       thumbHeight: CONFIG.thumbHeight,
//       thumbsPerSprite,
//       sprites: spritesMeta,
//     };

//     fs.writeFileSync(
//       `${METADATA}/preview.json`,
//       JSON.stringify(metadata, null, 2)
//     );

//     res.json({ success: true, metadata });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Processing failed");
//   }
// });

// app.get("/process-video", async (_, res) => {
//   try {
//     /* ---------- CONFIG ---------- */
//     const {
//       interval,
//       thumbWidth,
//       thumbHeight,
//       columns,
//       rows
//     } = CONFIG;

//     const thumbsPerSprite = columns * rows;

//     /* ---------- STEP 1: GET VIDEO DURATION ---------- */
//     const duration = await getVideoDuration(VIDEO_PATH);

//     /* ---------- STEP 2: GENERATE THUMBNAILS ---------- */
//     await new Promise((resolve, reject) => {
//       ffmpeg(VIDEO_PATH)
//         .output(path.join(THUMBS, "thumb-%04d.jpg"))
//         .outputOptions([
//           `-vf fps=1/${interval},scale=${thumbWidth}:${thumbHeight}`,
//           "-q:v 2",
//           "-y"
//         ])
//         .on("end", resolve)
//         .on("error", reject)
//         .run();
//     });

//     /* ---------- STEP 3: READ ACTUAL THUMBS ---------- */
//     const thumbFiles = fs
//       .readdirSync(THUMBS)
//       .filter(f => f.endsWith(".jpg"))
//       .sort();

//     const totalThumbs = thumbFiles.length;

//     if (!totalThumbs) {
//       return res.status(400).json({ error: "No thumbnails generated" });
//     }

//     const spriteCount = Math.ceil(totalThumbs / thumbsPerSprite);
//     const spritesMeta = [];

//     /* ---------- STEP 4: GENERATE SPRITES SAFELY ---------- */
//     for (let i = 0; i < spriteCount; i++) {
//       const startIndex = i * thumbsPerSprite;
//       const frames = Math.min(
//         thumbsPerSprite,
//         totalThumbs - startIndex
//       );

//       const spriteFile = `sprite-${i}.jpg`;

//       await new Promise((resolve, reject) => {
//         ffmpeg()
//           .input(path.join(THUMBS, "thumb-%04d.jpg"))
//           .inputOptions([`-start_number ${startIndex + 1}`])
//           .outputOptions([
//             `-frames:v ${frames}`,
//             `-vf tile=${columns}x${rows}`,
//             "-y"
//           ])
//           .save(path.join(SPRITES, spriteFile))
//           .on("end", resolve)
//           .on("error", reject);
//       });

//       spritesMeta.push({
//         url: `/sprites/${spriteFile}`,
//         startIndex,
//         frames,
//         columns,
//         rows
//       });
//     }

//     /* ---------- STEP 5: WRITE METADATA ---------- */
//     const metadata = {
//       duration,
//       interval,
//       thumbWidth,
//       thumbHeight,
//       columns,
//       rows,
//       thumbsPerSprite,
//       totalThumbs,
//       sprites: spritesMeta
//     };

//     fs.writeFileSync(
//       path.join(METADATA, "preview.json"),
//       JSON.stringify(metadata, null, 2)
//     );

//     /* ---------- DONE ---------- */
//     res.json({ success: true, metadata });

//   } catch (err) {
//     console.error("Video processing error:", err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// });

// app.get("/process-video", async (_, res) => {
//   try {
//     const {
//       interval,
//       thumbWidth,
//       thumbHeight,
//       columns,
//       rows
//     } = CONFIG;

//     const thumbsPerSprite = columns * rows;

//     /* ---------- 1. VIDEO DURATION ---------- */
//     const duration = await getVideoDuration(VIDEO_PATH);

//     /* ---------- 2. GENERATE THUMBNAILS ---------- */
//     await new Promise((resolve, reject) => {
//       ffmpeg(VIDEO_PATH)
//         .output(path.join(THUMBS, "thumb-%04d.jpg"))
//         .outputOptions([
//           `-vf fps=1/${interval},scale=${thumbWidth}:${thumbHeight}`,
//           "-q:v", "2",
//           "-y"
//         ])
//         .on("end", resolve)
//         .on("error", reject)
//         .run();
//     });

//     /* ---------- 3. READ THUMBS ---------- */
//     const thumbs = fs
//       .readdirSync(THUMBS)
//       .filter(f => f.endsWith(".jpg"))
//       .sort();

//     const totalThumbs = thumbs.length;
//     if (!totalThumbs) throw new Error("No thumbnails generated");

//     const spriteCount = Math.ceil(totalThumbs / thumbsPerSprite);
//     const spritesMeta = [];

//     /* ---------- 4. GENERATE SPRITES (CORRECT & STABLE) ---------- */
//     for (let i = 0; i < spriteCount; i++) {
//       const startIndex = i * thumbsPerSprite;
//       const frames = Math.min(
//         thumbsPerSprite,
//         totalThumbs - startIndex
//       );

//       const spriteRows = Math.ceil(frames / columns);
//       const spriteFile = `sprite-${i}.jpg`;

//       await new Promise((resolve, reject) => {
//         ffmpeg()
//           .input(path.join(THUMBS, "thumb-%04d.jpg"))
//           .inputOptions([
//             "-pattern_type", "sequence",
//             "-start_number", String(startIndex + 1),
//             "-framerate", "1"
//           ])
//           .outputOptions([
//             "-frames:v", String(frames),
//             "-vf", `tile=${columns}x${spriteRows}`,
//             "-y"
//           ])
//           .save(path.join(SPRITES, spriteFile))
//           .on("end", resolve)
//           .on("error", reject);
//       });

//       spritesMeta.push({
//         url: `/sprites/${spriteFile}`,
//         startIndex,
//         frames,
//         columns,
//         rows: spriteRows
//       });
//     }

//     /* ---------- 5. METADATA ---------- */
//     const metadata = {
//       duration,
//       interval,
//       thumbWidth,
//       thumbHeight,
//       totalThumbs,
//       thumbsPerSprite,
//       sprites: spritesMeta
//     };

//     fs.writeFileSync(
//       path.join(METADATA, "preview.json"),
//       JSON.stringify(metadata, null, 2)
//     );

//     res.json({ success: true, metadata });

//   } catch (err) {
//     console.error("Processing failed:", err);
//     res.status(500).json({
//       success: false,
//       error: err.message
//     });
//   }
// });

app.listen(4000, () => {
  console.log("Backend running at http://localhost:4000");
});
