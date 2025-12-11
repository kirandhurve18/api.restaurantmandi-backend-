const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  saveItem,
  getSavedItems,
  deleteSaveItem,
} = require("../controllers/savedItemsController");
const { protect } = require("../middleware/customerAuthMiddleware");

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     return cb(null, "./uploads/images/complaints");
//   },
//   filename: function (req, file, cb) {
//     const filenameWithoutSpaces = file.originalname.replace(/\s+/g, "");
//     return cb(null, `${Date.now()}-${filenameWithoutSpaces}`);
//   },
// });

// const upload = multer({ storage: storage });

router.post("/", protect, saveItem);
router.post("/all", protect, getSavedItems);
router.post("/delete", protect, deleteSaveItem);

module.exports = router;
