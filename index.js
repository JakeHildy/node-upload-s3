require("dotenv/config");
const express = require("express");
const multer = require("multer");
const AWS = require("aws-sdk");
const uuid = require("uuid/v4");
const sharp = require("sharp");

const app = express();
PORT = 3000;

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ID,
  secretAccessKey: process.env.AWS_SECRET,
});

app.use(express.json());
app.use(express.static("public"));

const storage = multer.memoryStorage({
  destination: (req, file, callback) => {
    callback(null, "");
  },
});

const upload = multer({ storage }).single("image");

function uploadToS3(resolution, imgBuffer) {
  const params = {
    Bucket: `${process.env.AWS_BUCKET_NAME}`,
    Key: `${uuid()}-${resolution}px.png`,
    Body: imgBuffer,
  };
  return new Promise((resolve, reject) => {
    s3.upload(params)
      .promise()
      .then((data) => {
        resolve(data);
      })
      .catch((err) => {
        reject(new Error(err));
      });
  });
}

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

    // Upload image data to the MongoDB
    console.log(data);
  } catch (err) {
    console.log(err);
  }
});

////////////////////////////
// LISTEN
app.listen(PORT, () => {
  console.log(`Server listening on PORT: ${PORT}`);
});
