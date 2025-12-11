const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  getVendorChats,
  getSingleChat,
  getCustomerChats,
} = require("../controllers/chatController");
const { protect } = require("../middleware/vendorAuthMiddleware");

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     return cb(null, "./uploads/images/complaints");
//   },
//   filename: function (req, file, cb) {
//     const filenameWithoutSpaces = file.originalname.replace(/\s+/g, "");
//     return cb(null, `${Date.now()}-${filenameWithoutSpaces}`);
//   },
// });

// const upload = multer({ storage: storage });

router.get("/vendor", protect, getVendorChats);
router.get("/customer", protect, getCustomerChats);
router.post("/single", protect, getSingleChat);

module.exports = router;
