const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/customerAuthMiddleware");
const {
  searchProduct,
  filterProducts,
  searchProductForMobile,
} = require("../controllers/searchController");

router.get("/product", protect, searchProduct);
router.get("/product-mob", protect, searchProductForMobile);
router.post("/product-filter", protect, filterProducts);

module.exports = router;
