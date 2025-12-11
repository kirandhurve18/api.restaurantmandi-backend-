const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  registerCustomer,
  loginCustomer,
  verifyOtp,
  updateProfile,
  getCustomerProfile,
  deleteCustomer,
  registerCustomerWithOTP,
  verifyRegistrationOtp,
  logoutCustomer,
  refreshAccessAndRefreshTokensForCustomer,
  loginCustomerWithEmail
} = require("../controllers/customerController");
const { protect } = require("../middleware/customerAuthMiddleware");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, "./uploads/images/customer");
  },
  filename: function (req, file, cb) {
    const filenameWithoutSpaces = file.originalname.replace(/\s+/g, "");
    return cb(null, `${Date.now()}-${filenameWithoutSpaces}`);
  },
});

const upload = multer({ storage });

router.post("/register", upload.single("profileImage"), registerCustomer);
router.post("/register-with-otp", registerCustomerWithOTP);
router.post("/login", loginCustomer);
router.post("/login-email", loginCustomerWithEmail);
router.post("/logout", protect, logoutCustomer);
router.post("/verify-otp", verifyOtp);
router.post("/verify-registration-otp", verifyRegistrationOtp);
router.post("/profile", getCustomerProfile);
router.post("/delete", deleteCustomer);
router.post("/update", upload.single("profileImage"), updateProfile);

router.post("/refresh-token", refreshAccessAndRefreshTokensForCustomer);

module.exports = router;
