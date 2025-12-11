const express = require("express");
const { getPrivacyPolicy, getTermsAndConditions } = require("../controllers/policyController");
const router = express.Router();

router.get("/privacy_policy", getPrivacyPolicy);
router.get("/terms_and_conditions", getTermsAndConditions);

module.exports = router;