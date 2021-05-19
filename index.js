require("dotenv/config");
const express = require("express");
const multer = require("multer");

const sharp = require("sharp");
const { uploadToS3, deleteFile } = require("./amazonS3");

const app = express();
PORT = 3000;

app.use(express.json());
app.use(express.static("public"));

const storage = multer.memoryStorage({
  destination: (req, file, callback) => {
    callback(null, "");
  },
});

const upload = multer({ storage }).single("image");

app.delete(`/:name`, async (req, res) => {
  try {
    const s3Res = await deleteFile(req.params.name);
    res.status(200).json({ status: "success", message: s3Res });
  } catch (err) {
    res.status(500).json({ status: "fail", error: err.message });
  }
});

app.post(`/upload`, upload, async (req, res) => {
  try {
    let [myName] = req.file.originalname.split(".");
    const localFileName = `${Date.now()}-${myName}.png`;

    // Rezise and save locally
    await sharp(req.file.buffer)
      .resize(375)
      .png()
      .toFile(`public/${localFileName}`);

    res.status(200).json({ status: "success", localFileName });

    // Create Buffers for each size
    const sizes = [375, 768];
    const buffers = await Promise.all(
      sizes.map((size) => sharp(req.file.buffer).resize(size).png().toBuffer())
    );

    // Upload Images to Amazon S3
    const data = await Promise.all(
      sizes.map((size, i) => {
        return uploadToS3(size, buffers[i]);
      })
    );

    // Upload image data to the MongoDB TODO
  } catch (err) {
    res.status(500).json({ status: "fail", error: err.message });
  }
});

////////////////////////////
// LISTEN
app.listen(PORT, () => {
  console.log(`Server listening on PORT: ${PORT}`);
});
