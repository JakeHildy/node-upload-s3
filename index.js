require("dotenv/config");
const express = require("express");
const multer = require("multer");
const AWS = require("aws-sdk");
const uuid = require("uuid/v4");

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

app.post(`/upload`, upload, (req, res) => {
  let [myName, fileType] = req.file.originalname.split(".");

  // console.log(req.files); if multiple files *
  console.log(myName, fileType);

  const params = {
    Bucket: `${process.env.AWS_BUCKET_NAME}`,
    Key: `${uuid()}.${fileType}`,
    Body: req.file.buffer,
  };

  s3.upload(params, (error, data) => {
    if (error) {
      return res.send(500).send(error);
    }
    res.status(200).send(data);
  });
});

////////////////////////////
// LISTEN
app.listen(PORT, () => {
  console.log(`Server listening on PORT: ${PORT}`);
});
