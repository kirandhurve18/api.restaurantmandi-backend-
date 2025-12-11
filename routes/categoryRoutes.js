const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  createCategory,
  getCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
  getVendorCategories,
  fetchAllCategories,
  getVendorRelatedCategories,
  toggleCategoryShowOnHome,
} = require("../controllers/categoryController");
const { protect } = require("../middleware/vendorAuthMiddleware");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, "./uploads/images/category");
  },
  filename: function (req, file, cb) {
    const filenameWithoutSpaces = file.originalname.replace(/\s+/g, "");
    return cb(null, `${Date.now()}-${filenameWithoutSpaces}`);
  },
});

const upload = multer({ storage: storage });

router.post("/", upload.single("categoryImage"), protect, createCategory);
router.post("/toggle-category-status", toggleCategoryShowOnHome);
router.get("/", protect, getVendorRelatedCategories);
router.get("/all", protect, getAllCategories);
router.get("/fetch", fetchAllCategories); // For Mobile App Side
router.get("/vendor/:id", protect, getVendorCategories);
router
  .route("/:id")
  // .all(protect)
  .get(getCategory)
  .put(upload.single("categoryImage"), updateCategory)
  .delete(deleteCategory);

module.exports = router;
