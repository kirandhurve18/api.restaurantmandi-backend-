const express = require("express");
const router = express.Router();

const { verifyCoupon } = require("../controllers/couponController");
const { protect } = require("../middleware/vendorAuthMiddleware");

router.get("/verify", protect, verifyCoupon);

module.exports = router;
