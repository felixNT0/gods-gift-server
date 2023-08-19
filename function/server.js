const express = require("express");
const cors = require("cors");
const { config } = require("dotenv");
const router = require("../src/routes/routes");
const bodyParser = require("body-parser");
const serverless = require("serverless-http");

config();

const app = express();
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
// const allowedOrigins = [
//   "https://fkt-calling-app.vercel.app/",
//   "http://localhost:3000",
// ];
// app.use(
//   cors({
//     origin: (origin, callback) => {
//       if (allowedOrigins.includes(origin) || !origin) {
//         callback(null, true);
//       } else {
//         callback(new Error("Not allowed by CORS"));
//       }
//     },
//   })
// );

// GET all meeting
app.use("/.netlify/functions/server", router);
module.exports.handler = serverless(app);

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
