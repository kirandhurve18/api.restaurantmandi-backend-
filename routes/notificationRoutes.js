const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/customerAuthMiddleware");

const {
  sendEnquiryNotification,
  listCustomerNotifications,
  listVendorNotifications,
} = require("../controllers/notificationController");

router.post("/enquiry",  sendEnquiryNotification);
router.post("/customer", protect, listCustomerNotifications);
router.post("/vendor", protect, listVendorNotifications);

module.exports = router;
