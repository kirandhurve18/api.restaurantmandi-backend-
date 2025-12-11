const express = require("express");
const router = express.Router();
const {
  getHomePageData,
  maintenaceData,
  getBanners,
} = require("../controllers/homepageController");
const { protect } = require("../middleware/customerAuthMiddleware");

router.get("/", protect, getHomePageData);
router.get("/maintenance", protect, maintenaceData);
router.get("/banner", protect, getBanners);

module.exports = router;
