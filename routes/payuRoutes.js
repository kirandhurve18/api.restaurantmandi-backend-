const express = require("express");
const { initiatePayUPayment, payuWebhookStatus, createPayuPaymentLink } = require("../controllers/payuController");
const router = express.Router();

router.post("/payu-initiate", initiatePayUPayment);
router.post("/webhook_status", payuWebhookStatus);
router.post("/send_link", createPayuPaymentLink);

module.exports = router;