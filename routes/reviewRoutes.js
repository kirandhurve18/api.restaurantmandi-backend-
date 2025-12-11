const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/vendorAuthMiddleware");

const {
  createReview,
  getVendorRelatedReviews,
} = require("../controllers/reviewController");

router.post("/", protect, createReview);
router.get("/", protect, getVendorRelatedReviews);

module.exports = router;
