const asyncHandler = require("express-async-handler");
const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth"); // npm install mammoth

const getPrivacyPolicy = asyncHandler(async (req, res) => {
  try {
    const policyPath = path.join(__dirname, "..", "policies", "PrivacyPolicy.docx"); 
    // place your Word doc at /static/privacyPolicy.docx

    if (!fs.existsSync(policyPath)) {
      return res.status(200).json({
        message: "Privacy Policy not found!",
        data: "",
        success: false,
      });
    }

    const result = await mammoth.extractRawText({ path: policyPath });
    const policyText = result.value; // raw text of the doc

    if (!policyText) {
      return res.status(200).json({
        message: "Privacy Policy is empty!",
        data: "",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Privacy Policy fetched successfully!",
      data: policyText,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching privacy policy:", error);
    return res.status(500).json({
      message: "Something went wrong!",
      data: "",
      success: false,
    });
  }
});

const getTermsAndConditions = asyncHandler(async (req, res) => {
  try {
    const termsAndConditionsPath = path.join(__dirname, "..", "policies", "TermsAndConditions.docx"); 
    // place your Word doc at /static/privacyPolicy.docx

    if (!fs.existsSync(termsAndConditionsPath)) {
      return res.status(200).json({
        message: "Terms And Conditions not found!",
        data: "",
        success: false,
      });
    }

    const result = await mammoth.extractRawText({ path: termsAndConditionsPath });
    const policyText = result.value; // raw text of the doc

    if (!policyText) {
      return res.status(200).json({
        message: "Privacy Policy is empty!",
        data: "",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Terms And Conditions fetched successfully!",
      data: policyText,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching terms And conditions:", error);
    return res.status(500).json({
      message: "Something went wrong!",
      data: "",
      success: false,
    });
  }
});

module.exports = { getPrivacyPolicy, getTermsAndConditions };
