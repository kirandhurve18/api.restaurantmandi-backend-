const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  createComplaint,
  getVendorComplaints,
} = require("../controllers/complaintController");
const { protect } = require("../middleware/vendorAuthMiddleware");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, "./uploads/images/complaints");
  },
  filename: function (req, file, cb) {
    const filenameWithoutSpaces = file.originalname.replace(/\s+/g, "");
    return cb(null, `${Date.now()}-${filenameWithoutSpaces}`);
  },
});

const upload = multer({ storage: storage });

router.post("/", upload.array("attachment"), protect, createComplaint);
router.get("/", protect, getVendorComplaints);

module.exports = router;
