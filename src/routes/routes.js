const express = require("express");
const {
  getAllMeetings,
  getMeetingId,
  createMeeting,
  editMeeting,
  deleteMeeting,
  generateAgoraToken,
  loginUser,
  registerUser,
} = require("../controllers/appControllers.js");

const router = express.Router();

router.get("/", getAllMeetings);
router.post("/", createMeeting);
router.get("/:id", getMeetingId);
router.put("/:id", editMeeting);
router.delete("/:id", deleteMeeting);
router.post("/agora/token", generateAgoraToken);
router.post("/login", loginUser);
router.post("/register", registerUser);

module.exports = router;
