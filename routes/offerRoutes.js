const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/vendorAuthMiddleware");

const {
  createOffer,
  getVendorOffers,
} = require("../controllers/offerController");

router.post("/", protect, createOffer);
router.get("/", protect, getVendorOffers);

module.exports = router;
