const express = require("express");
const router = express.Router();
const path = require('path');
const multer = require("multer");
const {
  registerAdmin,
  loginAdmin,
  getAllVendorDetails,
  logoutAdmin,
  refreshAccessAndRefreshTokensForAdmin,
  getVendorStats,
  getAllVendorSubscriptionDetails,
  addVendor,
  getVendorDetails,
  updateVendor,
  createCategory,
  getCategory,
  getAllCategory,
  fetchAllCategories,
  updateCategory,
  createSubCategory,
  getSubCategory,
  getAllSubCategory,
  updateSubCategory,
  getSuppliersEnquiryTracker,
  getEmployeeList,
  setTrackedByForVendors,
  deleteSubCategory,
  deleteCategory,
  deleteVendor
} = require("../controllers/adminController");
const adminAuth = require("../middleware/adminAuthMiddleware")

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, "./uploads/images/category");
  },
  filename: function (req, file, cb) {

    const extension = path.extname(file.originalname);
    const basename = path.basename(file.originalname, extension);
    const sanitizedBasename = basename.toLowerCase().replace(/[^a-z0-9]/g, "-");

    cb(null, `${sanitizedBasename}-${Date.now()}${extension}`);
  },
});

const storage1 = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, "./uploads/images/subCategory");
  },
  filename: function (req, file, cb) {

    const extension = path.extname(file.originalname);
    const basename = path.basename(file.originalname, extension);
    const sanitizedBasename = basename.toLowerCase().replace(/[^a-z0-9]/g, "-");

    cb(null, `${sanitizedBasename}-${Date.now()}${extension}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB
  },
});
const upload1 = multer({
  storage: storage1,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB
  },
});

router.post("/register", registerAdmin);
router.post("/login", loginAdmin);

router.get("/list-vendors", adminAuth, getAllVendorDetails);
router.post("/subscription-details", adminAuth, getAllVendorSubscriptionDetails);
router.post("/enquiry-details", adminAuth, getSuppliersEnquiryTracker);
router.get("/get-employee-list", adminAuth, getEmployeeList);
router.post("/set-tracked-by", adminAuth, setTrackedByForVendors);
router.get("/stats", adminAuth, getVendorStats);
router.post("/logout", adminAuth, logoutAdmin);
router.post("/refresh-token", refreshAccessAndRefreshTokensForAdmin);
router.post("/create-vendor", adminAuth, addVendor);
router.get("/get-vendor/:id", adminAuth, getVendorDetails);
router.put("/update-vendor/:id", adminAuth, updateVendor);
router.delete("/delete-vendor/:id", adminAuth, deleteVendor);

router.post("/create-category", adminAuth, upload.single("categoryImage"), createCategory);
router.get("/get-category/:id", adminAuth, getCategory);
router.put("/update-category/:id", adminAuth, upload.single("categoryImage"), updateCategory);
router.get("/get-allcategory", adminAuth, getAllCategory);
router.get("/fetch-all-categories", adminAuth, fetchAllCategories);
router.delete("/delete-category/:id", adminAuth, deleteCategory);
router.post("/create-subcategory", adminAuth, upload1.single("subCategoryImage"), createSubCategory);
router.get("/get-subcategory/:id", adminAuth, getSubCategory);
router.put("/update-subcategory/:id", adminAuth, upload1.single("subCategoryImage"), updateSubCategory);
router.get("/get-allsubcategory/:categoryId", adminAuth, getAllSubCategory);
router.delete("/delete-sub-category/:id", adminAuth, deleteSubCategory);

module.exports = router;