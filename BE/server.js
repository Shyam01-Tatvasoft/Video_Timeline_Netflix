const express = require("express");
const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath('C:/ffmpeg/bin/ffmpeg.exe');
const path = require("path");
const fs = require("fs");

const app = express();
app.use(require("cors")());

const VIDEO_PATH = "videos/sample.mp4";
const THUMB_DIR = "thumbnails";

if (!fs.existsSync(THUMB_DIR)) fs.mkdirSync(THUMB_DIR);

app.get("/generate-thumbnails", (req, res) => {
  ffmpeg(VIDEO_PATH)
    .output(`${THUMB_DIR}/thumb-%03d.jpg`)
    .outputOptions(["-vf fps=1/2,scale=160:90"])
    .on("end", () => res.send("Thumbnails generated"))
    .run();
});


app.use("/sprites", express.static("sprites"));
app.use("/metadata", express.static("metadata"));

app.listen(4000, () => console.log("Backend running on 4000"));
