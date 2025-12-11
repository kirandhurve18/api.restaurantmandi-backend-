const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const Razorpay = require("razorpay");
const ShortUniqueId = require("short-unique-id");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const fs = require("fs");
const mongoose = require("mongoose")
const path = require("path");

const Vendor = require("../models/vendorModel");
const Product = require("../models/productModel");
const ChatEnquiries = require("../models/chatModel");
const Enquiry = require("../models/enquiryModel");
const Review = require("../models/reviewModel");
const { getPayuAccessToken, generatePaymentLink } = require("./payuController");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const EMAIL = process.env.EMAIL || "contact@restaurantmandi.com"
const PASSWORD = process.env.EMAIL_APP_PASSWORD || "Business@1234"

const transporter = nodemailer.createTransport({
  host: 'smtpout.secureserver.net',
  port: 465,
  secure: true,
  auth: {
    user: EMAIL,
    pass: PASSWORD
  }
});

const sendRegistrationMail = (email, mobile, randomPassword, url) => {
  const emailTemplatePath = path.join(
    __dirname,
    "..",
    "email_template",
    "emailTemplate.html"
  );

  fs.readFile(emailTemplatePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading HTML file:", err);
      return;
    }

    const emailContent = data
      .replace("{{EMAIL}}", email)
      .replace("{{PHONE}}", mobile)
      .replace("{{PASSWORD}}", randomPassword)
      .replace("{{URL}}", url);

    transporter
      .sendMail({
        from: process.env.EMAIL,
        to: email,
        subject: "Waayu Restaurant Mandi Registration",
        html: emailContent,
      })
      .then((info) => {
        console.log(info);
      })
      .catch(console.error);
  });
};

const sendRegistrationMessage = async (data) => {
  const interaktAccessKey = "WFlWc2FUTzhRbWNTZzJ1V0llS2hmS1ZURTEtY01kYjRkcXdBcUhOOEVrczo=";
  if (!data.phone_number) {
    console.error("Please provide phone number");
    return;
  }
  const createUser = {
    "userId": `${data.phone_number}_${Date.now()}`,
    "phoneNumber": `${data.phone_number}`,
    "countryCode": "+91",
    "traits": {
      "name": `${data.user_name || "NA"}`
    }
  }

  const headers = {
    "Authorization": `Basic ${interaktAccessKey}`,
    "Content-Type": "application/json",
  };

  await axios.post("https://api.interakt.ai/v1/public/track/users/", createUser, { headers });


  const sendTemplatePayload = {
    "countryCode": "+91",
    "phoneNumber": `${data.phone_number}`,
    "type": "Template",
    "template": {
      "name": "restaurant_mandi_registration_tn",
      "languageCode": "en",
      "bodyValues": [
        `${data.email || "NA"}`,
        `${data.mobile || "NA"}`,
        `Password:${data.password || "NA"}`
      ]
    }
  }

  await axios.post("https://api.interakt.ai/v1/public/message/", sendTemplatePayload, { headers })
}

// @desc Register a new Vendor
// @route POST /api/vendor/register
// const registerVendor = asyncHandler(async (req, res) => {
//   let { email, mobile } = req?.body;

//   if (!email) {
//     return res
//       .status(400)
//       .json({ message: "Please provide the email field.", success: false });
//   }
//   if (!mobile) {
//     return res
//       .status(400)
//       .json({ message: "Please provide the mobile field.", success: false });
//   }

//   // Find if Vendor already exists
//   let vendorExists = await Vendor.findOne({
//     $or: [{ mobile }, { email }],
//   });

//   if (vendorExists?.isPayment === true && vendorExists?.status == 1) {
//     return res
//       .status(400)
//       .json({ message: "Vendor already registered!", success: false });
//   }

//   const four_digit_random_number = generateOtp();

//   const data = {
//     email,
//     mobile,
//     otp: four_digit_random_number,
//     isPayment: false,
//   };

//   if (vendorExists) {
//     await Vendor.findOneAndUpdate(
//       { mobile },
//       { otp: four_digit_random_number },
//     );
//     const country_code = "91";
//     const phoneNumber = country_code + mobile;

//     const numbers = phoneNumber;

//     await send_message(numbers, four_digit_random_number, "waayu");

//     return res.status(200).json({
//       _id: vendorExists._id,
//       email: vendorExists.email,
//       mobile: vendorExists.mobile,
//       // otp: four_digit_random_number,
//       token: generateToken(vendorExists._id),
//       isPayment: false,
//       createdAt: vendorExists.createdAt,
//       updatedAt: vendorExists.updatedAt,
//       success: true,
//     });
//   } else {
//     let vendor = await Vendor.create(data);

//     if (vendor) {
//       const country_code = "91";
//       const phoneNumber = country_code + mobile;

//       const numbers = phoneNumber;

//       await send_message(numbers, four_digit_random_number, "waayu");

//       return res.status(201).json({
//         _id: vendor._id,
//         email: vendor.email,
//         mobile: vendor.mobile,
//         // otp: four_digit_random_number,
//         token: generateToken(vendor._id),
//         isPayment: false,
//         createdAt: vendor.createdAt,
//         updatedAt: vendor.updatedAt,
//         success: true,
//       });
//     } else {
//       return res
//         .status(400)
//         .json({ message: "Error while creating vendor!", message: false });
//     }
//   }
// });

const registerVendor = asyncHandler(async (req, res) => {
  const { email, mobile } = req.body;

  if (!mobile) {
    return res
      .status(400)
      .json({ message: "Please provide the mobile field.", success: false });
  }

  if (!email) {
    return res
      .status(400)
      .json({ message: "Please provide the email field.", success: false });
  }

  // Check if vendor already exists by mobile only
  const vendorExists = await Vendor.findOne({ mobile });

  // Case 1: Vendor exists and payment is done → reject
  if (vendorExists?.isPayment === true && vendorExists?.status == 1) {
    return res.status(400).json({
      message: "Vendor already registered!",
      success: false,
    });
  }

  const otp = generateOtp();
  const phoneNumber = "91" + mobile;
  const randomPassword = crypto.randomBytes(4).toString("hex");
  const hashedPassword = await bcrypt.hash(randomPassword, 10);

  // Case 2: Vendor exists but payment not done → resend OTP
  if (vendorExists) {
    const updatedVendor = await Vendor.findOneAndUpdate(
      { mobile },
      { otp, email, password: hashedPassword },
      { new: true }
    );

    await send_message(phoneNumber, otp, "waayu");

    const whatsAppMessage = {
      "phone_number": updatedVendor.mobile,
      "user_name": updatedVendor.businessDetails?.businessName || "User",
      "email": updatedVendor.email,
      "mobile": updatedVendor.mobile,
      "password": randomPassword
    }

    await sendRegistrationMessage(whatsAppMessage)

    sendRegistrationMail(
      updatedVendor.email,
      updatedVendor.mobile,
      randomPassword,
      "https://marketplace.restaurantmandi.com/login"
    );

    // await Whatsapp message

    return res.status(200).json({
      message: "Vendor exists without payment, OTP resent.",
      _id: updatedVendor._id,
      email: updatedVendor.email,
      mobile: updatedVendor.mobile,
      token: generateToken(updatedVendor._id),
      isPayment: false,
      createdAt: updatedVendor.createdAt,
      updatedAt: new Date(),
      success: true,
    });
  }

  // Case 3: New vendor registration → create + send OTP
  const newVendor = await Vendor.create({
    email,
    mobile,
    otp,
    password: hashedPassword,
    isPayment: false,
  });

  if (!newVendor) {
    return res.status(400).json({
      message: "Error while creating vendor!",
      success: false,
    });
  }

  await send_message(phoneNumber, otp, "waayu");

  const whatsAppMessage = {
    "phone_number": newVendor.mobile,
    "user_name": newVendor.name,
    "email": newVendor.email,
    "mobile": newVendor.mobile,
    "password": randomPassword
  }


  await sendRegistrationMessage(whatsAppMessage)

  sendRegistrationMail(
    newVendor.email,
    newVendor.mobile,
    randomPassword,
    "https://marketplace.restaurantmandi.com/login"
  );

  return res.status(201).json({
    message: "Vendor registered successfully. OTP sent.",
    _id: newVendor._id,
    email: newVendor.email,
    mobile: newVendor.mobile,
    token: generateToken(newVendor._id),
    isPayment: false,
    createdAt: newVendor.createdAt,
    updatedAt: newVendor.updatedAt,
    success: true,
  });
});

const registerOrUpdateVendorFromLeadzilla = asyncHandler(async (req, res) => {
  const {
    businessName,
    businessNumber,
    alternateMobile,
    email,
    remarks,
    address,
    pincode,
    latitude,
    longitude,
    onboardedBy,
    categories,
    businessWebsite,
    fren_user_id
  } = req.body;

  //  Validate required fields
  if (!businessName || !businessNumber || !email || !address || !pincode) {
    return res.status(400).json({
      message: "Please provide all required fields.",
      success: false,
    });
  }

  //  Find vendor by email
  const vendorExists = await Vendor.findOne({ email });

  //  CASE 1: Vendor exists → update like updateVendor
  if (vendorExists) {
    const updateFields = {};

    // Business details
    updateFields["businessDetails.businessName"] = businessName;

    // Basic fields
    updateFields.mobile = businessNumber; // update mobile field
    updateFields.alternateMobile = alternateMobile || vendorExists.alternateMobile || null;
    updateFields.address = address || vendorExists.address || "";
    updateFields.pincode = pincode || vendorExists.pincode || "";
    updateFields.remarks = remarks || vendorExists.remarks || "";

    // Business website — ensure number is same as businessNumber
    updateFields.businessWebsite = {
      website: businessWebsite || vendorExists.businessWebsite?.website || null,
      number: businessNumber, // always update with businessNumber
    };

    // Location details (GeoJSON)
    if (latitude && longitude) {
      updateFields["locationDetails.gps"] = {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      };
    }

    // Categories
    if (categories && Array.isArray(categories)) {
      updateFields.categories = categories.map((cat) => ({
        categoryId: cat.categoryId,
      }));
    }
    updateFields.leadSource = "Leadzilla";

    // Update vendor
    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorExists._id,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedVendor) {
      return res.status(500).json({
        message: "Error while updating vendor!",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Vendor updated successfully via Leadzilla.",
      data: updatedVendor,
      success: true,
    });
  }

  // CASE 2: Vendor not found → create new vendor
  const newVendorData = {
    email,
    mobile: businessNumber,
    alternateMobile: alternateMobile || null,
    isPayment: false,
    remarks: remarks || "",
    address,
    pincode,
    onboardedBy,
    fren_user_id,
    "businessDetails.businessName": businessName,
    businessWebsite: {
      website: businessWebsite || null,
      number: businessNumber,
    },
    categories:
      categories && Array.isArray(categories)
        ? categories.map((cat) => ({ categoryId: cat.categoryId }))
        : [],
    leadSource: "Leadzilla",
  };

  // Add location details if coordinates provided
  if (latitude && longitude) {
    newVendorData["locationDetails.gps"] = {
      type: "Point",
      coordinates: [parseFloat(longitude), parseFloat(latitude)],
    };
  }

  const newVendor = await Vendor.create(newVendorData);

  if (!newVendor) {
    return res.status(400).json({
      message: "Error while creating vendor!",
      success: false,
    });
  }

  return res.status(201).json({
    message: "Vendor registered successfully via Leadzilla.",
    data: newVendor,
    success: true,
  });
});

const getLeadzillaRegisteredVendorDetails = asyncHandler(async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        message: "VendorId is required.",
        success: false,
      });
    }

    const vendor = await Vendor.findOne({ _id: id, leadSource: "Leadzilla" })
      .select(
        "email mobile alternateMobile address pincode subscription_plan subscription_status sup_followup_status sup_status remarks leadSource businessWebsite businessDetails.businessName categories createdAt updatedAt kyc locationDetails.gps"
      )
      .populate("categories.categoryId", "categoryName");
      console.log(vendor)

    if (!vendor) {
      return res.status(404).json({
        message: "Vendor not found.",
        success: false,
      });
    }

    const statusMap = {
      discussion_initiated: "Discussion Initiated",
      interested_follow_up: "Interested Follow Up",
      successfully_onboarded: "Successfully Onboarded",
      not_interested: "Not Interested",
      new_lead: "New Lead",
      decision_pending: "Decision Pending",
      documents_pending: "Documents Pending",
      follow_up_rescheduled: "Follow-Up Rescheduled",
    };

    // let finalResult = {
    //   ...result[0],
    //   ...storeMap,
    //   followup_status:
    //     statusMap[result[0].followup_status] || result[0].followup_status,
    // }

    let paymentLink = null;

    if (vendor.subscription_plan === "prepaid") {
      try {
        const accessToken = await getPayuAccessToken();
        const { paymentLink: generatedLink } = await generatePaymentLink(
          accessToken,
          vendor._id,
          vendor.businessDetails?.businessName,
          vendor.email,
          vendor.mobile
        );
      
        console.log("PAYMENT LINK:", paymentLink)
        paymentLink = generatedLink || null;
      } catch (error) {
        console.error("Error generating payment link:", error);
        paymentLink = null;
      }
    }

    return res.status(200).json({
      message: "Vendor fetched successfully.",
      data: {
        id: vendor._id,
        businessName: vendor.businessDetails?.businessName || "",
        businessNumber: vendor.mobile || "",
        alternateMobile: vendor.alternateMobile || "",
        email: vendor.email || "",
        address: vendor.address || "",
        pincode: vendor.pincode || "",
        remarks: vendor.remarks || "",
        businessWebsite: vendor.businessWebsite?.website || "",
        websiteNumber: vendor.businessWebsite?.number || "",
        categories:
          vendor.categories?.map((c) => ({
            id: c.categoryId?._id || "",
            name: c.categoryId?.categoryName || ""
          })) || [],
        kyc: vendor.kyc,
        longitude: vendor.locationDetails?.gps?.coordinates[0] || null,
        latitude: vendor.locationDetails?.gps?.coordinates[1] || null,
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt,
        subscription_plan: vendor.subscription_plan || null,
        subscription_status: vendor.subscription_status || null,
        followup_status: statusMap[vendor.sup_followup_status] || vendor.sup_followup_status || null,
        sup_status: vendor.sup_status || null,
        subscription_payment_link: paymentLink || null,
      },
      success: true,
    });
  } catch (error) {
    console.error("Error fetching vendor details:", error);
    return res.status(500).json({
      message: "Error fetching vendor details.",
      error: error.message,
      success: false,
    });
  }
});

const updateVendorKycDetailsFromLeadzilla = asyncHandler(async (req, res) => {
  const { id, hasGstin, isGstVerified, gstNumber } = req.body;

  if (
    !id ||
    hasGstin === undefined ||
    isGstVerified === undefined ||
    (hasGstin && !gstNumber)
  ) {
    return res.status(400).json({
      message: "Please provide all required fields.",
      success: false,
    });
  }

  const vendorExists = await Vendor.findOne({ _id: id, leadSource: "Leadzilla" });

  if (!vendorExists) {
    return res.status(404).json({
      message: "Vendor not found.",
      success: false,
    });
  }

  const updatedKyc = { ...vendorExists.kyc };

  if (typeof hasGstin === "boolean") {
    updatedKyc.hasGstin = hasGstin;
    updatedKyc.isGstVerified = isGstVerified ?? false;

    if (hasGstin === true) {
      // Real GST provided
      updatedKyc.gstNumber = gstNumber || null;
      updatedKyc.temporaryGstNumber = null;
    } else {
      // No GST → treat gstNumber as temporary
      updatedKyc.temporaryGstNumber = gstNumber || null;
      updatedKyc.gstNumber = null;
      updatedKyc.isGstVerified = false;
    }
  }

  let updateFields = {};

  updateFields.kyc = updatedKyc;

  //  Update vendor
  const updatedVendor = await Vendor.findByIdAndUpdate(
    vendorExists._id,
    { $set: updateFields },
    { new: true }
  );

  return res.status(200).json({
    message: "KYC details updated successfully.",
    success: true,
  });
});

const verifyGST = asyncHandler(async (req, res) => {
  const { gstNumber } = req.body;

  if (!gstNumber) {
    return res.status(400).json({
      success: false,
      message: 'GST Number is required'
    });
  }

  // Call the external GST verification API from the backend
  const response = await axios.post(
    'https://api.cra.kychub.com/kyc/india/v2/gst-details',
    { gstNumber },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GST_AUTH_TOKEN}`
      }
    }
  );

  return res.status(200).json({
    success: true,
    message: 'GST Number verified successfully',
    data: response.data.data
  });
})

const updateVenderStatus = asyncHandler(async (req, res) => {
  try {
    const sup_status = req.body.sup_status;
    const sup_followup_status = req.body.sup_followup_status;
    const id = req.body.id;

    if (!sup_status || !sup_followup_status || !id) {
      return res.status(400).json({
        message: "Please Provode Status, Followup Status and VendorId",
        success: false
      });
    }

    const vendor = await Vendor.findOne({ _id: id });
    const randomPassword = crypto.randomBytes(4).toString("hex");

    if (sup_followup_status == "successfully_onboarded") {
      console.log("sup_followup_status-->", sup_followup_status)

      const gst = vendor.kyc.hasGstin;
      const gstNumber = vendor.kyc.gstNumber;
      const isGstVerified = vendor.kyc.isGstVerified;
      const temporaryGstNumber = vendor.kyc.temporaryGstNumber;

      if (!gst && !isGstVerified) {
        return res.status(400).json({
          message: "please update gst and verify",
          success: false
        })
      } else if (!gst && !temporaryGstNumber) {
        return res.status(400).json({
          message: "please update gst and verify",
          success: false
        })
      }

      if (!vendor.subscription_plan || vendor.subscription_status != "active") {
        return res.status(400).json({
          message: "please select subsciption plan and make payment",
          success: false
        })
      }

      sendRegistrationMail(
        vendor.email,
        vendor.mobile,
        randomPassword,
        "https://marketplace.restaurantmandi.com/login"
      );
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      await Vendor.findOneAndUpdate(
        { _id: id },
        {
          $set: {
            password: hashedPassword
          },
        }
      );
    }

    let updatedDoc = await Vendor.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          sup_status: sup_status,
          sup_followup_status: sup_followup_status,
        },
      },
      { new: true }
    );

    return res.status(200).json({
      message: "Status Updated Success",
      success: true,
      data: updatedDoc
    });

  } catch (error) {
    return res.status(201).json({
      message: "Error While Updating status",
      success: false,
    });
  }
});

const getAllVendorsListForLeadzillaUser = asyncHandler(async (req, res) => {
  const { fren_user_id, status, page, limit } = req.query;

  if (!fren_user_id) {
    return res.status(400).json({ message: "fren_user_id is required" });
  }

  // Check if page and limit are provided
  const isPaginationRequested = page !== undefined && limit !== undefined;
  
  let queryOptions = {
    fren_user_id,
    ...(status && { sup_followup_status: status }),
  };

  let vendors, totalCount;

  if (isPaginationRequested) {
    // Use pagination when page and limit are provided
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 5;
    const skip = (pageNum - 1) * limitNum;

    [vendors, totalCount] = await Promise.all([
      Vendor.find(queryOptions)
        .select("_id name address createdAt alternateMobile locationDetails businessWebsite businessDetails.businessName")
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 }),
      Vendor.countDocuments(queryOptions),
    ]);

    return res.status(200).json({
      totalCount,
      currentPage: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      limit: limitNum,
      vendors
    });
  } else {
    // Return all vendors when page and limit are not provided
    vendors = await Vendor.find(queryOptions)
      .select("_id name address createdAt alternateMobile locationDetails businessWebsite businessDetails.businessName")
      .sort({ createdAt: -1 });
    
    totalCount = vendors.length;

    return res.status(200).json({
      totalCount,
      vendors
    });
  }
});


// @desc Login a new Vendor
// @route POST /api/vendor/login
const loginVendor = asyncHandler(async (req, res) => {
  const { mobile, deviceId, fcmId, hashKey } = req?.body;

  if (!mobile) {
    return res
      .status(400)
      .json({ message: "Please provide the mobile field!", success: false });
  }

  const vendor = await Vendor.findOne({ mobile });

  if (!vendor) {
    return res
      .status(404)
      .json({ message: "Vendor not found!", success: false });
  }

  // if (vendor && vendor.status == 0) {
  //   return res
  //     .status(402)
  //     .json({ message: "Your account is inactive. Please subscribe or renew your plan to log in.", success: false });
  // }

  if (vendor && vendor.mobile == mobile) {
    if (deviceId && fcmId) {
      await Vendor.findOneAndUpdate(
        { mobile },
        { deviceId: deviceId, fcmId: fcmId }
      );
      console.log("Updated");
    }

    const country_code = "91";
    const phoneNumber = country_code + mobile;

    const numbers = phoneNumber;
    // const sender = "WAAYUF";

    const four_digit_random_number = generateOtp();
    // const message = `Dear Vendor, your OTP is "${four_digit_random_number}" to login/signup in Marketplace App. Thank You!`;

    // const apikey = "NzE2NzRjNmQ3OTc2NzA3YTU1Mzg0MTQ0NzA0YzMxNjI=";

    await Vendor.findOneAndUpdate(
      { mobile },
      { otp: four_digit_random_number }
    );

    // const sendSmsRes = await send_message(numbers, four_digit_random_number);
    const sendSmsRes = await send_message(
      numbers,
      four_digit_random_number,
      "waayu"
    );

    console.log("sendSmsRes", sendSmsRes);

    if (sendSmsRes.status === "OK") {
      return res
        .status(200)
        .json({ message: "OTP sent successfully!", success: true });
    } else if (sendSmsRes.status === "failure") {
      return res
        .status(500)
        .json({ message: "Error while sending otp!", success: false });
    }
  } else {
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { mobile, otp } = req?.body;

  if (!mobile) {
    return res
      .status(400)
      .json({ message: "Please provide the mobile field!", success: false });
  }
  if (!otp) {
    return res
      .status(400)
      .json({ message: "Please provide the otp field!", success: false });
  }

  const vendor = await Vendor.findOne({ mobile });

  if (!vendor) {
    return res
      .status(404)
      .json({ message: "Vendor not found!", success: false });
  }

  if (vendor && vendor.otp == otp) {
    await Vendor.findOneAndUpdate({ mobile }, { otp: null });

    return res.status(200).json({
      _id: vendor._id,
      name: vendor.name,
      email: vendor.email,
      mobile: vendor.mobile,
      city: vendor.city ? vendor.city : "",
      businessName: vendor.businessDetails.businessName
        ? vendor.businessDetails.businessName
        : "",
      isPayment: vendor?.isPayment || false,
      token: generateToken(vendor._id),
      success: true,
    });
  } else if (vendor.otp == null) {
    return res.status(400).json({ message: "OTP has already been used or expired", success: false });
  } else {
    return res.status(500).json({ message: "Wrong OTP!", success: false });
  }
});

// Login with Email
const loginWithEmail = asyncHandler(async (req, res) => {
  const { email, password } = req?.body;

  if (!email) {
    return res
      .status(400)
      .json({ message: "Provide the email field!", success: false });
  }
  if (!password) {
    return res
      .status(400)
      .json({ message: "Provide the password field!", success: false });
  }

  const vendor = await Vendor.findOne({ email });

  if (!vendor) {
    return res
      .status(404)
      .json({ message: "Vendor not found!", success: false });
  }

  if (!vendor.password) {
    return res.status(400).json({
      message: "Password not set for this vendor. Please reset or re-register.",
      success: false,
    });
  }

  const isPasswordCorrect = await bcrypt.compare(password, vendor.password);

  if (vendor && isPasswordCorrect) {
    return res.status(200).json({
      _id: vendor._id,
      email: vendor.email,
      name: vendor.name,
      mobile: vendor.mobile,
      city: vendor.city ? vendor.city : "",
      businessName: vendor.businessDetails.businessName
        ? vendor.businessDetails.businessName
        : "",
      isPayment: vendor?.isPayment || false,
      token: generateToken(vendor._id),
      success: true,
    });
  } else {
    return res.status(500).json({ message: "Wrong Password", success: false });
  }
});

// Generate token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.ACCESS_TOKEN_SECRET);
};

const generateOtp = () => {
  return Math.floor(1000 + Math.random() * 9000);
};

async function send_message(numbers, otp, hashkey) {
  const formData = new FormData();

  formData.append("mobile", numbers);
  formData.append("otp", otp);
  formData.append("hashkey", hashkey);

  const response = await axios.post(
    "https://master.waayu.app/otp_sender/send_message.php",
    formData
  );

  const result = response.data;
  return result;
}

// async function send_message(numbers, otp, hashkey) {
//   const message = `Your OTP for verification is ${otp} ${hashkey}. Thank you for using Restaurant Mandi.`;

//   console.log("Reached in sms send request")
//   const response = await axios.post(
//     "http://world.prestigeitech.in/V2/http-api-post.php",
//     {
//       apikey: process.env.SMS_API_KEY,
//       senderid: process.env.SMS_SENDER_ID,
//       number: numbers,
//       message
//     }
//   );

//   const result = response.data;
//   return result;
// }

// router.put("/update") for registeration page
// const updateVendor = asyncHandler(async (req, res) => {
//   let data = req?.body;

//   if (!data || data.length === 0) {
//     return res.json({ message: "No data found from body!", success: false });
//   }

//   const vendorExists = await Vendor.findOne({ mobile: data.mobile });

//   if (!vendorExists) {
//     return res
//       .status(400)
//       .json({ message: "Vendor not Found!", success: false });
//   }

//   if (req.file) {
//     const filenameWithoutSpaces = req.file.filename.replace(/\s+/g, "");
//     data.profileImage = filenameWithoutSpaces;
//   }

//   const updateVendor = await Vendor.findByIdAndUpdate(vendorExists?._id, data, {
//     new: true,
//   });

//   if (!updateVendor) {
//     return res
//       .status(400)
//       .json({ message: "Error while updating vendor!", success: false });
//   }

//   res.status(200).json({ data: updateVendor, success: true });
// });

const updateVendor = asyncHandler(async (req, res) => {
  const data = req.body;

  if (!data || Object.keys(data).length === 0) {
    return res.status(400).json({
      message: "No data found in body!",
      success: false,
    });
  }

  if (!data.mobile) {
    return res.status(400).json({
      message: "Mobile number is required to find vendor!",
      success: false,
    });
  }

  // 🔹 Find vendor by mobile
  const vendorExists = await Vendor.findOne({ mobile: data.mobile });

  if (!vendorExists) {
    return res.status(404).json({
      message: "Vendor not found!",
      success: false,
    });
  }

  //  Handle profile image (if uploaded)
  if (req.file) {
    const filenameWithoutSpaces = req.file.filename.replace(/\s+/g, "");
    data.profileImage = filenameWithoutSpaces;
  }

  //  Prepare update fields
  const updateFields = {};

  // Business Details
  if (data.businessName) {
    updateFields["businessDetails.businessName"] = data.businessName;
  }

  if (data.city) {
    updateFields.city = data.city;
  }

  if (data.address) {
    updateFields.address = data.address;
  }

  if (data.alternateMobile) {
    updateFields.alternateMobile = data.alternateMobile;
  }

  //  Business Website & Number
  updateFields.businessWebsite = {
    website: data.website || vendorExists.businessWebsite?.website || null,
    number: data.businessNumber || vendorExists.businessWebsite?.number || null,
  };

  //  Categories
  if (data.categories && Array.isArray(data.categories)) {
    updateFields.categories = data.categories.map((cat) => ({
      categoryId: cat.categoryId,
    }));
  }

  //  GST / KYC Handling
  const updatedKyc = { ...vendorExists.kyc };

  if (typeof data.hasGstin === "boolean") {
    updatedKyc.hasGstin = data.hasGstin;
    updatedKyc.isGstVerified = data.isGstVerified ?? false;

    if (data.hasGstin === true) {
      // Real GST provided
      updatedKyc.gstNumber = data.gstNumber || null;
      updatedKyc.temporaryGstNumber = null;
    } else {
      // No GST → treat gstNumber as temporary
      updatedKyc.temporaryGstNumber = data.gstNumber || null;
      updatedKyc.gstNumber = null;
      updatedKyc.isGstVerified = false;
    }
  }

  updateFields.kyc = updatedKyc;

  //  Update vendor
  const updatedVendor = await Vendor.findByIdAndUpdate(
    vendorExists._id,
    { $set: updateFields },
    { new: true }
  );

  if (!updatedVendor) {
    return res.status(500).json({
      message: "Error while updating vendor!",
      success: false,
    });
  }

  return res.status(200).json({
    message: "Vendor updated successfully!",
    data: updatedVendor,
    success: true,
  });
});


// Profile Update
const updateVendorDetails = asyncHandler(async (req, res) => {
  let data = req?.body;

  if (!data || data.length === 0) {
    return res.json({ message: "No data found from body!", success: false });
  }

  const id = req.params.id;

  const vendorExists = await Vendor.findById(id);

  if (!vendorExists) {
    return res
      .status(400)
      .json({ message: "Vendor not Found!", success: false });
  }

  if (req.file) {
    const filenameWithoutSpaces = req.file.filename.replace(/\s+/g, "");
    data.profileImage = filenameWithoutSpaces;
  }

  const updateVendor = await Vendor.findByIdAndUpdate(id, data, {
    new: true,
  });

  if (!updateVendor) {
    return res
      .status(400)
      .json({ message: "Error while updating vendor!", success: false });
  }

  res.status(200).json({ data: updateVendor, success: true });
});

const updateVendorProfileImage = asyncHandler(async (req, res) => {
  const vendorId = req.params.id;

  // Check if vendor exists
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    return res.status(404).json({ message: "Vendor not found!", success: false });
  }

  // Check if file is uploaded
  if (!req.file) {
    return res.status(400).json({ message: "No image file uploaded!", success: false });
  }

  // Save filename in DB
  const filenameWithoutSpaces = req.file.filename.replace(/\s+/g, "");
  vendor.profileImage = filenameWithoutSpaces;

  await vendor.save();

  // Prepend base URL
  const imageUrl = `${process.env.APP_BASE_URL}/uploads/images/vendor/${filenameWithoutSpaces}`;

  res.status(200).json({
    success: true,
    data: imageUrl,
  });
});

const getVendor = asyncHandler(async (req, res) => {
  const id = req.params.id;

  const vendor = await Vendor.findById(id);

  if (!vendor) {
    return res
      .status(400)
      .json({ message: "Vendor not found!", success: false });
  }

  res.status(200).json({ vendor, success: true });
});

const initiateRazorpay = asyncHandler(async (req, res) => {
  const data = req.body;

  if (!data || Object.keys(data).length === 0) {
    return res
      .status(400)
      .json({ message: "Please provide the data!", success: false });
  }
  const amount = parseInt(data?.amount);
  const currency = "INR";
  const uid = new ShortUniqueId({ length: 10 });
  const todayDate = new Date().getTime();

  const options = {
    amount: amount * 100,
    currency: currency,
    receipt: `${todayDate}`,
  };

  try {
    const response = await razorpay.orders.create(options);
    console.log("razorpay initiate response is ==>", response)
    return res.status(200).json({ data: response, success: true });
  } catch (error) {
    return res.status(400).json({ data: error, success: false });
  }
});

const storeRazorpayResponse = asyncHandler(async (req, res) => {
  const data = req.body;

  if (!data || Object.keys(data).length === 0) {
    return res
      .status(400)
      .json({ message: "Please provide the data!", success: false });
  }

  let newData = {
    notes: data.notes,
    razorpayResponse: data.razorpayResponse,
    isPayment: true,
  };

  const storeData = await Vendor.findByIdAndUpdate(
    data?.notes?.userId,
    newData
  );

  await Vendor.findByIdAndUpdate(data?.notes?.userId, { status: "1" });

  if (storeData) {
    return res.status(200).json({
      vendor: storeData,
      message: "Data stored successfully!",
      success: true,
    });
  } else {
    return res
      .status(400)
      .json({ message: "Error while storing data!", success: false });
  }
});

const easebuzzPaymentInitiate = asyncHandler(async (req, res) => {
  const bodydata = req.body;

  if (!bodydata || Object.keys(bodydata).length === 0) {
    return res
      .status(400)
      .json({ message: "Please provide the body data!", success: false });
  }

  const todayDate = new Date().getTime();

  const key = process.env.EASEBUZZ_KEY;
  const salt = process.env.EASEBUZZ_SALT;
  const txnid = `${todayDate}`;
  const amount = parseFloat(bodydata.amount).toFixed(2);
  const productinfo = "Restaurant Mandi Vendor Registration";
  const firstname = bodydata.name;
  const email = bodydata.email;
  const phone = bodydata.mobile;
  const surl = "https://www.google.co.in";
  const furl = "https://www.youtube.com";

  const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${salt}`;
  const hash = crypto.createHash("sha512").update(hashString).digest("hex");

  const encodedParams = new URLSearchParams();
  encodedParams.set("txnid", txnid);
  encodedParams.set("key", key);
  encodedParams.set("amount", amount);
  encodedParams.set("productinfo", productinfo);
  encodedParams.set("firstname", firstname);
  encodedParams.set("email", email);
  encodedParams.set("phone", phone);
  encodedParams.set("surl", surl);
  encodedParams.set("furl", furl);
  encodedParams.set("hash", hash);

  const options = {
    method: "POST",
    url: "https://testpay.easebuzz.in/payment/initiateLink",
    // url: "https://pay.easebuzz.in/payment/initiateLink",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    data: encodedParams,
  };

  const { data } = await axios.request(options);

  if (data.status === 1) {
    return res.status(200).json({ ...data, success: true });
  } else if (data.status === 0) {
    return res.status(400).json({ ...data, success: false });
  }
});

const storeEasebuzzResponse = asyncHandler(async (req, res) => {
  const data = req.body;

  if (!data || Object.keys(data).length === 0) {
    return res
      .status(400)
      .json({ message: "Please provide the body data!", success: false });
  }

  let newData = {
    notes: data.notes,
    easeBuzzResponse: data.easeBuzzResponse,
    isPayment: true,
  };

  const storeData = await Vendor.findByIdAndUpdate(
    data?.notes?.userId,
    newData
  );

  await Vendor.findByIdAndUpdate(data?.notes?.userId, { status: "1" });

  if (storeData) {
    return res.status(200).json({
      vendor: storeData,
      message: "Data stored successfully!",
      success: true,
    });
  } else {
    return res
      .status(400)
      .json({ message: "Error while storing data!", success: false });
  }
});

const holidayList = asyncHandler(async (req, res) => {
  const data = [
    { name: "New Year", date: "01-Jan-2024" },
    { name: "Republic Day", date: "26-Jan-2024" },
    { name: "Holi", date: "25-Mar-2024" },
    { name: "Gudhi Padwa", date: "09-Apr-2024" },
    { name: "Maharashtra Day", date: "01-May-2024" },
    { name: "Independence Day", date: "15-Aug-2024" },
    { name: "Ganesh Chaturthi", date: "07-Sep-2024" },
    { name: "Anant Chaturdashi", date: "17-Sep-2024" },
    { name: "Mahatma Gandhi Jayanti", date: "02-Oct-2024" },
    { name: "Dusshera", date: "12-Oct-2024" },
    { name: "Diwali- Laxmi Pujan", date: "01-Nov-2024" },
    { name: "Diwali- Balipratipada", date: "02-Nov-2024" },
    { name: "Christmas Day", date: "25-Dec-2024" },
  ];

  res.status(200).json({ data, success: true });
});

// Upload Rate Card
// /api/vendor/rate-card
const uploadRateCard = asyncHandler(async (req, res) => {
  const vendorId = req.body.vendorId;

  if (!vendorId) {
    return res.status(400).json({ message: "Please provide the vendorId!" });
  }

  let vendor = await Vendor.findOne({ _id: vendorId });

  if (!vendor) {
    return res
      .status(400)
      .json({ message: "Vendor not found!", success: false });
  }

  let productImages = [];
  let productResImages = [];

  if (req.files && req.files.length > 0) {
    productImages = req.files.map((file) => {
      const filenameWithoutSpaces = file.filename.replace(/\s+/g, "");
      productResImages.push(
        `${process.env.APP_BASE_URL}/uploads/images/vendor/${filenameWithoutSpaces}`
      );
      return filenameWithoutSpaces;
    });
    vendor.rateCard = productImages;
  }

  const result = await vendor.save();

  if (!result) {
    return res
      .status(400)
      .json({ message: "Error while uploading rate card!", success: false });
  }

  res.status(200).json({ data: result, success: true });
});

// Get Rate Card Data
const getRateCard = asyncHandler(async (req, res) => {
  const vendorId = req.query.vendorId;

  if (!vendorId) {
    return res.status(400).json({ message: "Please provide the vendorId!" });
  }

  let vendor = await Vendor.findOne({ _id: vendorId });

  if (!vendor) {
    return res
      .status(400)
      .json({ message: "Vendor not found!", success: false });
  }

  res.status(200).json({ data: vendor.rateCard, success: true });
});

// Upload Gallery
// /api/vendor/gallery
const uploadGallery = asyncHandler(async (req, res) => {
  const vendorId = req.body.vendorId;

  if (!vendorId) {
    return res.status(400).json({ message: "Please provide the vendorId!" });
  }

  let vendor = await Vendor.findOne({ _id: vendorId });

  if (!vendor) {
    return res
      .status(400)
      .json({ message: "Vendor not found!", success: false });
  }

  let productImages = [];
  let productResImages = [];

  if (req.files && req.files.length > 0) {
    productImages = req.files.map((file) => {
      const filenameWithoutSpaces = file.filename.replace(/\s+/g, "");
      productResImages.push(
        `${process.env.APP_BASE_URL}/uploads/images/vendor/${filenameWithoutSpaces}`
      );
      return productResImages;
    });
    vendor.gallery = productImages;
  }

  const result = await vendor.save();

  if (!result) {
    return res
      .status(400)
      .json({ message: "Error while uploading gallery!", success: false });
  }

  res.status(200).json({ data: result.gallery, success: true });
});

// Get Gallery Images
const getGalleryImages = asyncHandler(async (req, res) => {
  const vendorId = req.query.vendorId;

  if (!vendorId) {
    return res.status(400).json({ message: "Please provide the vendorId!" });
  }

  let vendor = await Vendor.findOne({ _id: vendorId });

  if (!vendor) {
    return res
      .status(400)
      .json({ message: "Vendor not found!", success: false });
  }

  // Prepend base URL to each image
  const baseUrl = process.env.APP_BASE_URL;
  const galleryWithUrls = (vendor.gallery || []).map(
    (img) => `${baseUrl}/uploads/images/vendor/${img}`
  )

  res.status(200).json({ data: galleryWithUrls, success: true });
});

const getAllVendors = asyncHandler(async (req, res) => {
  const vendors = await Vendor.find().select("_id businessDetails.businessName profileImage isPayment");

  if (!vendors || vendors.length === 0) {
    return res.status(201).send([]);
  }

  const transformedVendors = vendors.map((vendor) => ({
    _id: vendor._id,
    name: vendor.businessDetails.businessName,
    image: `${process.env.APP_BASE_URL}/uploads/images/vendor/${vendor.profileImage}`,
    isSubscribed: vendor.isPayment || false
  }));

  return res.status(200).send(transformedVendors);
});

const calculateProfileScore = (vendor) => {
  let totalFields = 0;
  let completedFields = 0;

  // Function to check if a field is completed
  const isCompleted = (field) => {
    return field !== undefined && field !== null && field !== "";
  };

  // Helper function to count fields in nested objects
  const countFields = (obj, path = "") => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        totalFields++;
        if (isCompleted(obj[key])) {
          completedFields++;
        }
      }
    }
  };

  // List of fields to check
  const fieldsToCheck = [
    "name",
    "email",
    "password",
    "mobile",
    "status",
    "otp",
    "address",
    "city",
    "state",
    "pincode",
    "businessWebsite.website",
    "businessWebsite.number",
    "categories",
    "businessDetails.businessName",
    "businessDetails.legalBusinessName",
    "contactDetails.contactName",
    "contactDetails.designation",
    "contactDetails.owner",
    "contactDetails.whatsapp",
    "contactDetails.mobileNumber",
    "contactDetails.emailAddress",
    "contactDetails.landline",
    "contactDetails.tollFreeNumber",
    "locationDetails.buildingName",
    "locationDetails.streetName",
    "locationDetails.landmark",
    "locationDetails.area",
    "locationDetails.pincode",
    "locationDetails.city",
    "locationDetails.state",
    "locationDetails.country",
    "businessTimings.regular.days",
    "businessTimings.regular.regularTime",
    "businessTimings.holiday.days",
    "businessTimings.holiday.holidayTimings",
    "businessTimings.isAdditionalNote",
    "businessTimings.notes",
    "establishment.month",
    "establishment.year",
    "turnover",
    "employees",
    "social.facebook",
    "social.instagram",
    "social.twitter",
    "social.youtube",
    "social.linkedin",
    "social.others",
    // "deviceId",
    // "fcmId",
    // "hashKey",
    "profileImage",
    // "isPayment",
    // "notes.userId",
    // "notes.response",
    // "notes.amount",
    // "razorpayResponse.razorpayPaymentId",
    // "razorpayResponse.razorpayOrderId",
    // "razorpayResponse.razorpaySignature",
    // "easeBuzzResponse.bankRefNumber",
    // "easeBuzzResponse.easepayId",
    // "easeBuzzResponse.email",
    // "easeBuzzResponse.hash",
    // "easeBuzzResponse.key",
    // "easeBuzzResponse.status",
    // "easeBuzzResponse.txnId",
    // "isCouponApplied",
    // "couponAmount",
    // "couponCode",
    // "couponDiscount",
    "rateCard",
    "gallery",
    "kyc.businessType",
    "kyc.personName",
    "kyc.hasGstin",
    "kyc.gstNumber",
  ];

  // Check each field
  fieldsToCheck.forEach((field) => {
    const value = field
      .split(".")
      .reduce((o, i) => (o ? o[i] : undefined), vendor);
    totalFields++;
    if (isCompleted(value)) {
      completedFields++;
    }
  });

  // Calculate the percentage
  const profileScore = (completedFields / totalFields) * 100;

  return Math.round(profileScore); // Return the score as a percentage
};

const getVendorProfileScore = asyncHandler(async (req, res) => {
  const { vendorId } = req.body;

  try {
    const vendor = await Vendor.findById(vendorId).lean();
    if (!vendor) {
      return res
        .status(404)
        .json({ message: "Vendor not found", success: false });
    }

    let enquiry = await Enquiry.find({
      vendorId: vendorId,
    }).countDocuments();

    if (!enquiry) {
      enquiry = 0;
    }

    const profileScore = calculateProfileScore(vendor) + "%";

    res
      .status(200)
      .json({ profileScore, enquiryCount: enquiry, success: true });
  } catch (error) {
    res.status(500).json({ message: error.message, success: false });
  }
});

// Mobile App
// const getVendorInfo = asyncHandler(async (req, res) => {
//   const { vendorId } = req.body;

//   if (!vendorId) {
//     return res.status(400).json({ message: "Please provide the vendorId!" });
//   }

//   const vendor = await Vendor.findById(vendorId);

//   if (!vendor) {
//     return res
//       .status(400)
//       .json({ message: "Vendor not found!", success: false });
//   }

//   const enquiries = await ChatEnquiries.find({
//     vendorId: vendorId,
//   }).countDocuments();

//   const products = await Product.find({ vendorId: vendorId });

//   const formatProducts = products.map((product) => ({
//     _id: product._id,
//     name: product.productName,
//     image: `${process.env.APP_BASE_URL}/uploads/images/product/${product?.productImage[0]}`,
//     singlePrice: product.singlePrice || "",
//     priceRange: product.priceRange || "",
//     priceBasedOnQty: product.priceBasedOnQty || "",
//   }));

//   let yearDifference;

//   let establishmentYear = vendor?.establishment?.year || 0;

//   if (establishmentYear > 0) {
//     // Get the current year
//     const currentYear = new Date().getFullYear();

//     // Calculate the difference between the current year and establishment year
//     yearDifference = currentYear - establishmentYear;
//   }

//   let categories = vendor.categories || [];

//   // Create an array of promises to fetch the product counts for each category
//   const categoryProductCounts = await Promise.all(
//     categories.map(async (category) => {
//       const productCount = await Product.find({
//         vendorId: vendorId,
//         categoryId: category.categoryId,
//       }).countDocuments();
//       return {
//         ...category._doc,
//         products: productCount,
//       };
//     })
//   );

//   // Add the "All" category at the beginning of the array
//   categoryProductCounts.unshift({ categoryName: "All" });

//   const data = {
//     _id: vendor._id,
//     name: vendor.name,
//     image: `${process.env.APP_BASE_URL}/uploads/images/vendor/${vendor.profileImage}`,
//     address: vendor.address,
//     city: vendor.city || "",
//     mobile: vendor.mobile || "",
//     state: vendor?.locationDetails?.state || "",
//     pincode: vendor?.locationDetails?.pincode || "",
//     year: yearDifference,
//     enquiries: enquiries || 0,
//     rating: vendor?.rating || 0,
//     businessDays: vendor?.businessTimings?.regular?.days || "",
//     businessTime: vendor?.businessTimings?.regular?.regularTime || "",
//     categories: categoryProductCounts,
//     products: formatProducts,
//   };

//   res.status(200).json({ data, success: true });
// });

// const getVendorInfo = asyncHandler(async (req, res) => {
//   const { vendorId } = req.body;

//   if (!vendorId) {
//     return res.status(400).json({ message: "Please provide the vendorId!" });
//   }

//   let searchVendorId = vendorId;
//   if (!mongoose.Types.ObjectId.isValid(vendorId)) {
//     searchVendorId = new mongoose.Types.ObjectId(vendorId);
//   }

//   const vendor = await Vendor.findById(searchVendorId);

//   if (!vendor) {
//     return res
//       .status(400)
//       .json({ message: "Vendor not found!", success: false });
//   }

//   const enquiries = await ChatEnquiries.find({
//     vendorId: vendorId,
//   }).countDocuments();

//   const products = await Product.find({ vendorId: vendorId });

//   const formatProducts = products.map((product) => ({
//     _id: product._id,
//     name: product.productName,
//     image: `${process.env.APP_BASE_URL}/uploads/images/product/${product?.productImage[0]}`,
//     singlePrice: product.singlePrice || "",
//     priceRange: product.priceRange || "",
//     priceBasedOnQty: product.priceBasedOnQty || "",
//     categoryId: product.categoryId,
//     isService: product.isService,
//   }));

//   let yearDifference;

//   let establishmentYear = vendor?.establishment?.year || 0;

//   if (establishmentYear > 0) {
//     // Get the current year
//     const currentYear = new Date().getFullYear();

//     // Calculate the difference between the current year and establishment year
//     yearDifference = currentYear - establishmentYear;
//   }

//   let categories = vendor.categories || [];

//   // Create an array to hold the formatted categories
//   const formattedCategories = categories.map((category) => {
//     const categoryProducts = formatProducts.filter(
//       (product) =>
//         product.categoryId.toString() === category.categoryId.toString()
//     );

//     return {
//       ...category._doc,
//       products: categoryProducts.slice(0, 3),
//       numberOfProducts: categoryProducts.length,
//     };
//   });

//   // Add the "All" category containing all products (limit to 3 for display)
//   formattedCategories.unshift({
//     categoryName: "All",
//     products: formatProducts.slice(0, 3),
//     numberOfProducts: formatProducts.length,
//   });

//   const data = {
//     _id: vendor._id,
//     name: vendor.name,
//     image: `${process.env.APP_BASE_URL}/uploads/images/vendor/${vendor.profileImage}`,
//     address: vendor.address,
//     mobile: vendor.mobile || "",
//     locationDetails: vendor?.locationDetails || {},
//     year: yearDifference,
//     enquiries: enquiries || 0,
//     rating: vendor?.rating || 0,
//     businessDays: vendor?.businessTimings?.regular?.days || "",
//     businessTime: vendor?.businessTimings?.regular?.regularTime || "",
//     categories: formattedCategories,
//   };

//   res.status(200).json({ data, success: true });
// });

const getVendorInfo = asyncHandler(async (req, res) => {
  const { vendorId } = req.body;

  if (!vendorId) {
    return res.status(400).json({ message: "Please provide the vendorId!" });
  }

  let searchVendorId = vendorId;
  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    searchVendorId = new mongoose.Types.ObjectId(vendorId);
  }

  // ✅ Fetch vendor
  const vendor = await Vendor.findById(searchVendorId);
  if (!vendor) {
    return res
      .status(400)
      .json({ message: "Vendor not found!", success: false });
  }

  // ✅ Fetch all products of this vendor and populate category for names
  const products = await Product.find({ vendorId: vendor._id }).populate("categoryId");

  // ✅ Format product details
  const formattedProducts = products.map((product) => ({
    _id: product._id,
    name: product.productName,
    image: product.productImage?.[0]
      ? `${process.env.APP_BASE_URL}/uploads/images/product/${product.productImage[0]}`
      : "",
    singlePrice: product.singlePrice || "",
    priceRange: product.priceRange || "",
    priceBasedOnQty: product.priceBasedOnQty || "",
    categoryId: product.categoryId?._id,
    categoryName: product.categoryId?.categoryName || "Uncategorized",
    isService: product.isService,
  }));

  // ✅ Group products by category
  const categoriesMap = {};
  formattedProducts.forEach((product) => {
    const catId = product.categoryId?.toString() || "uncategorized";
    if (!categoriesMap[catId]) {
      categoriesMap[catId] = {
        categoryId: product.categoryId,
        categoryName: product.categoryName,
        products: [],
      };
    }
    categoriesMap[catId].products.push(product);
  });

  // ✅ Convert to array and add product counts
  const formattedCategories = Object.values(categoriesMap).map((cat) => ({
    categoryId: cat.categoryId,
    categoryName: cat.categoryName,
    products: cat.products.slice(0, 3),
    numberOfProducts: cat.products.length,
  }));

  // ✅ Add an “All” category for all vendor products
  formattedCategories.unshift({
    categoryName: "All",
    products: formattedProducts.slice(0, 3),
    numberOfProducts: formattedProducts.length,
  });

  // ✅ Calculate year difference (years since establishment)
  let yearDifference = 0;
  const establishmentYear = vendor?.establishment?.year || 0;
  if (establishmentYear > 0) {
    const currentYear = new Date().getFullYear();
    yearDifference = currentYear - establishmentYear;
  }

  // ✅ Count enquiries (total for vendor)
  const enquiries = await ChatEnquiries.countDocuments({ vendorId: vendor._id });

  // ✅ Compute average rating from reviews
  const reviews = await Review.find({ vendorId: vendor._id });
  let avgRating = 0;
  if (reviews.length > 0) {
    const total = reviews.reduce((sum, r) => sum + (r.reviewStar || 0), 0);
    avgRating = (total / reviews.length).toFixed(1); // one decimal place
  }

  // ✅ Build response object
  const data = {
    _id: vendor._id,
    name: vendor.businessDetails?.businessName,
    image: vendor.profileImage
      ? `${process.env.APP_BASE_URL}/uploads/images/vendor/${vendor.profileImage}`
      : "",
    address: vendor.address,
    mobile: vendor.mobile || "",
    locationDetails: vendor?.locationDetails || {},
    year: yearDifference,
    isSubscribed: vendor?.isPayment || false,
    enquiries: enquiries || 0,
    rating: parseFloat(avgRating) || 0, // average review star
    businessDays: vendor?.businessTimings?.regular?.days || "",
    businessTime: vendor?.businessTimings?.regular?.regularTime || "",
    categories: formattedCategories,
  };

  res.status(200).json({ data, success: true });
});

const vendorOverview = asyncHandler(async (req, res) => {
  const { vendorId } = req.body;

  if (!vendorId) {
    return res.status(400).json({ message: "Please provide the vendorId!" });
  }

  const vendor = await Vendor.findById(vendorId);

  if (!vendor) {
    return res
      .status(400)
      .json({ message: "Vendor not found!", success: false });
  }

  let yearDifference;

  let establishmentYear = vendor?.establishment?.year || 0;

  if (establishmentYear > 0) {
    // Get the current year
    const currentYear = new Date().getFullYear();

    // Calculate the difference between the current year and establishment year
    yearDifference = currentYear - establishmentYear;
  }

  const reviews = await Review.find({ vendorId: vendor._id });
  let avgRating = 0;
  if (reviews.length > 0) {
    const total = reviews.reduce((sum, r) => sum + (r.reviewStar || 0), 0);
    avgRating = (total / reviews.length).toFixed(1); // one decimal place
  }

  const data = {
    _id: vendor._id,
    name: vendor.businessDetails?.businessName,
    address: vendor.address,
    city: vendor?.locationDetails?.city || "",
    state: vendor?.locationDetails?.state || "",
    pincode: vendor?.locationDetails?.pincode || "",
    streetName: vendor?.locationDetails?.streetName || "",
    buildingName: vendor?.locationDetails?.buildingName || "",
    establishmentYear: vendor?.establishment?.year || "",
    rating: parseFloat(avgRating) || 0, // average review star
    businessDays: vendor?.businessTimings?.regular?.days || "",
    businessTime: vendor?.businessTimings?.regular?.regularTime || "",
    gstin: vendor?.kyc?.gstNumber || "",
  };

  res.status(200).json({ data, success: true });
});

const getVendorCity = asyncHandler(async (req, res) => {
  const vendor = await Vendor.find();

  if (!vendor || vendor.length === 0) {
    return res
      .status(400)
      .json({ message: "Vendor not found!", success: false });
  }

  const cities = vendor
    .map((elem) => elem.locationDetails?.city)
    .filter((city) => city && city.trim() !== "");

  const uniqueCities = [...new Set(cities)];

  const cityObjects = uniqueCities.map((city) => ({ name: city }));

  res.status(200).json({ data: cityObjects, success: true });
});

module.exports = {
  registerVendor,
  registerOrUpdateVendorFromLeadzilla,
  getLeadzillaRegisteredVendorDetails,
  updateVendorKycDetailsFromLeadzilla,
  getAllVendorsListForLeadzillaUser,
  updateVenderStatus,
  loginVendor,
  verifyOtp,
  loginWithEmail,
  updateVendor,
  updateVendorDetails,
  updateVendorProfileImage,
  getVendor,
  initiateRazorpay,
  storeRazorpayResponse,
  easebuzzPaymentInitiate,
  storeEasebuzzResponse,
  holidayList,
  uploadRateCard,
  uploadGallery,
  getRateCard,
  getGalleryImages,
  getAllVendors,
  getVendorProfileScore,
  getVendorInfo,
  vendorOverview,
  getVendorCity,
  verifyGST
};
