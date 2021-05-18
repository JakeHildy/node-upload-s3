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

const storage = multer.memoryStorage({
  destination: (req, file, callback) => {
    callback(null, "");
  },
});

const upload = multer({ storage }).single("image");

app.post(`/upload`, upload, async (req, res) => {
  let [myName, fileType] = req.file.originalname.split(".");

  // console.log(req.files); if multiple files *

  try {
    const imageData = await sharp(req.file.buffer).metadata();
    const image375Buffer = await sharp(req.file.buffer)
      .resize(375)
      .png()
      .toBuffer();
    const image768Buffer = await sharp(req.file.buffer)
      .resize(768)
      .png()
      .toBuffer();
    const image1200Buffer = await sharp(req.file.buffer)
      .resize(1200)
      .png()
      .toBuffer();

    // --- Upload 375 ---
    const params375 = {
      Bucket: `${process.env.AWS_BUCKET_NAME}`,
      Key: `${uuid()}-375px.${fileType}`,
      Body: image375Buffer,
    };
    const params768 = {
      Bucket: `${process.env.AWS_BUCKET_NAME}`,
      Key: `${uuid()}-768px.${fileType}`,
      Body: image768Buffer,
    };
    const params1200 = {
      Bucket: `${process.env.AWS_BUCKET_NAME}`,
      Key: `${uuid()}-1200px.${fileType}`,
      Body: image1200Buffer,
    };

    const params = [params375, params768, params1200];
    const images = [];

    await (function () {
      params.forEach(async (param, index, array) => {
        const stored = await s3.upload(param).promise();
        images.push(stored);
        if (index === array.length - 1) {
          res.status(200).send(images);
        }
      });
    })();
  } catch (err) {
    console.log(err);
  }
});

////////////////////////////
// LISTEN
app.listen(PORT, () => {
  console.log(`Server listening on PORT: ${PORT}`);
});
