const asyncHandler = require("express-async-handler");
const admin = require("firebase-admin");
const agora = require("agora-access-token");
const moment = require("moment");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { config } = require("dotenv");

config();

const serviceAccount = require("../../firesbaseConfig.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Other configuration options
});

// Firestore instance
const db = admin.firestore();

const getAllMeetings = asyncHandler(async (req, res) => {
  try {
    const snapshot = await db.collection("meeting").get();
    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const parsedMeetingData = items.map((item) => ({
      ...item,
      date: moment(item.date), // Assuming 'date' is the property containing the date string
    }));
    // Sort the parsed data based on the 'date' property
    const sortedMeetingData = parsedMeetingData.sort((a, b) => b.date - a.date);
    return res.json(sortedMeetingData || []);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

const getMeetingId = asyncHandler(async (req, res) => {
  try {
    if (!req.params.id) return; // Ensure the ID is provided

    // const docRef = db.collection("meeting").doc(req.params.id);
    // const doc = await docRef.get();

    const snapshot = await db.collection("meeting").get();
    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const data = items.find((item) => item.id === req.params.id);
    if (!data) {
      return res.status(404).json({ error: "Item not found" });
    }

    return res.json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

const createMeeting = asyncHandler(async (req, res) => {
  try {
    const newItem = req.body;
    const docRef = await db.collection("meeting").add(newItem);
    return res.json({ id: docRef.id, ...newItem });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

const editMeeting = asyncHandler(async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const updatedItem = req.body;
    console.log("Updated Item:", updatedItem); // Debugging

    const docRef = db.collection("meeting").doc(id);
    await docRef.update(updatedItem);

    console.log("Document updated successfully"); // Debugging
    return res.json({ id: docRef.id, ...updatedItem });
  } catch (error) {
    console.error("Error updating document:", error);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

const deleteMeeting = asyncHandler(async (req, res) => {
  try {
    if (!req.params.id) return;
    const docRef = db.collection("meeting").doc(req.params.id);
    await docRef.delete();
    return res.json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

const generateAgoraToken = asyncHandler(async (req, res) => {
  const userId = 0;
  const { channelName, startDate } = req.body;

  const agoraAppId = process.env.AGORA_APP_ID || "";
  const agoraAppCertificate = process.env.AGORA_APP_CERTIFICATE || "";
  const startDateObject = new Date(startDate);
  const expirationTimeInSeconds =
    Math.floor(startDateObject.getTime() / 1000) + 86400;

  const token = agora.RtcTokenBuilder.buildTokenWithUid(
    agoraAppId,
    agoraAppCertificate,
    channelName,
    userId,
    agora.RtcRole.PUBLISHER,
    expirationTimeInSeconds
  );

  return res.json({ token });
});

export const registerUser = asyncHandler(async (req, res, next) => {
  const { first_name, last_name, username, email, password, user_role } =
    req.body;

  try {
    if (
      !first_name.trim() ||
      !email.trim() ||
      !password.trim() ||
      !last_name.trim() ||
      !username.trim()
    ) {
      res.status(400).send("Please add all fields");
    }
    const snapshot = await db.collection("users").get();
    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const userExists = await items.find((item) => item.email === email);

    if (userExists) {
      res.status(400).send("User already exists");
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const role = user_role ? user_role : "student";
    const newItem = req.body;
    const docRef = await db
      .collection("meeting")
      .add({ ...newItem, password: hashedPassword });

    if (docRef) {
      res.status(200).send({
        id: docRef.id,
        ...newItem,
        token: generateToken(docRef.id),
      });
    } else {
      res.status(400).send("Invalid user data");
    }
  } catch (error) {
    next(error);
  }
});

export const loginUser = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const snapshot = await db.collection("users").get();
    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const user = await items.find((item) => item.email === email);

    if (user && (await bcrypt.compare(password, user.password))) {
      res.status(200).send({
        _id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        user_role: user.user_role,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).send("Invalid credentials");
    }
  } catch (error) {
    next(error);
  }
});

const secretKey = String(process.env.DEFAULT_TOKEN) || "secrettoken";

export const generateToken = (id) => {
  return jwt.sign({ id }, secretKey, {
    expiresIn: "30d",
  });
};

module.exports = {
  deleteMeeting,
  editMeeting,
  createMeeting,
  getMeetingId,
  getAllMeetings,
  generateAgoraToken,
  loginUser,
  registerUser,
};
