const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  createSubCategory,
  getSubCategory,
  getSubCategoriesCategory,
  getAllSubCategories,
  updateSubCategory,
  deleteSubCategory,
  getSubCategoriesWithinCategory,
} = require("../controllers/subCategoryController");
const { protect } = require("../middleware/vendorAuthMiddleware");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, "./uploads/images/subCategory");
  },
  filename: function (req, file, cb) {
    const filenameWithoutSpaces = file.originalname.replace(/\s+/g, "");
    return cb(null, `${Date.now()}-${filenameWithoutSpaces}`);
  },
});

const upload = multer({ storage: storage });

router.post("/", upload.single("subCategoryImage"), protect, createSubCategory);
router.get("/", protect, getSubCategoriesWithinCategory); // for mobile app
router.get("/all",  getAllSubCategories);
router.get("/category/:id", protect, getSubCategoriesCategory);
router
  .route("/:id")
  // .all(protect)
  .get(getSubCategory)
  .put(upload.single("subCategoryImage"), updateSubCategory)
  .delete(deleteSubCategory);

module.exports = router;
