const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  createProduct,
  getProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
  bulkUpload,
  getVendorProducts,
  getProductsBasedOnVendorOrCategory,
  getProductDetails,
  getProductBestPriceDetail,
  exportBulkTemplate,
} = require("../controllers/productController");
const { protect } = require("../middleware/vendorAuthMiddleware");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, "./uploads/images/product");
  },
  filename: function (req, file, cb) {
    const filenameWithoutSpaces = file.originalname.replace(/\s+/g, "");
    return cb(null, `${Date.now()}-${filenameWithoutSpaces}`);
  },
});

const storage1 = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, "./uploads/files/product");
  },
  filename: function (req, file, cb) {
    const filenameWithoutSpaces = file.originalname.replace(/\s+/g, "");
    return cb(null, `${Date.now()}-${filenameWithoutSpaces}`);
  },
});

const upload = multer({ storage: storage });
const upload1 = multer({ storage: storage1 });

router.post(
  "/",
  upload.fields([
    { name: "productImage", maxCount: 12 },
    { name: "attachment", maxCount: 12 },
  ]),
  protect,
  createProduct
);
router.get("/all", protect, getAllProducts);
router.get("/", protect, getProductsBasedOnVendorOrCategory);
router.get("/detail", protect, getProductDetails); // app side
router.get("/vendor", protect, getVendorProducts);
router.post("/best-price-detail", protect, getProductBestPriceDetail);
router.post("/bulk", upload1.single("excelFile"), bulkUpload);
router.get("/bulk/template", exportBulkTemplate);
router
  .route("/:id")
  .all(protect)
  .get(getProduct)
  .put(upload.array("productImage"), updateProduct)
  .delete(deleteProduct);

module.exports = router;
