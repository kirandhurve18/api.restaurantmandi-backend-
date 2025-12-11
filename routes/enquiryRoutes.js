const express = require("express");
const router = express.Router();
const {
  createEnquiry,
  getAllEnquiries,
  getSingleEnquiry,
  updateEnquiry,
  deleteEnquiry,
  getReadEnquiries,
  getUnReadEnquiries,
  filterEnquiries,
  filterReadEnquiries,
  filterUnReadEnquiries,
  customerEnquiry,
  searchEnquiry,
  unreadEnquiryCount,
} = require("../controllers/enquiryController");
const { protect } = require("../middleware/customerAuthMiddleware");

router.post("/", createEnquiry);
router.get("/", protect, customerEnquiry);
router.get("/search", protect, searchEnquiry);
router.get("/unread-count", protect, unreadEnquiryCount);
router.get("/all", getAllEnquiries);
router.get("/read", protect, getReadEnquiries);
router.get("/unread", protect, getUnReadEnquiries);
router.get("/filter", protect, filterEnquiries);
router.get("/filter-read", protect, filterReadEnquiries);
router.get("/filter-unread", protect, filterUnReadEnquiries);
router
  .route("/:id")
  .get(protect, getSingleEnquiry)
  .put(protect, updateEnquiry)
  .delete(protect, deleteEnquiry);

module.exports = router;
