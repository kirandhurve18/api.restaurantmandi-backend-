const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const Vendor = require("../models/vendorModel");
const fs = require("fs");
const path = require("path");
const axios = require('axios');
const payuResponse = require("../models/payuResponseModel");

const PAYU_KEY = process.env.PAYU_TEST_MODE === "true" ? process.env.PAYU_KEY_TEST : process.env.PAYU_KEY_LIVE;
const PAYU_SALT = process.env.PAYU_TEST_MODE === "true" ? process.env.PAYU_SALT_TEST : process.env.PAYU_SALT_LIVE;
const BASE_URL = process.env.APP_BASE_URL || "https://api.restaurantmandi.com";

function generatePayuHash(params, salt) {
  const {
    key, txnid, amount, productinfo, firstname, email,
    udf1 = '', udf2 = '', udf3 = '', udf4 = '', udf5 = ''
  } = params;

  const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`;
  return crypto.createHash("sha512").update(hashString).digest("hex");
}

const initiatePayUPayment = async (req, res) => {
  try {

    const { firstname, email, phone, vendorId } = req.body;
    if (!firstname || !email || !phone || !vendorId) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const furl = `${BASE_URL}/api/payu/webhook_status`;
    const surl = `${BASE_URL}/api/payu/webhook_status`;
    const txnid = "txn" + Date.now();
    const productinfo = "Restaurant Mandi Vendor Registration";

    // Prepare params
    const params = {
      key: PAYU_KEY,
      txnid,
      amount: process.env.SUBSCRIPTION_AMOUNT,
      productinfo,
      firstname,
      email,
      phone,
      surl,
      furl,
      udf1: vendorId || ""
    };

    params.hash = generatePayuHash(params, PAYU_SALT);

    const paymentUrl = process.env.PAYU_TEST_MODE === "true"
      ? "https://test.payu.in/_payment"
      : "https://secure.payu.in/_payment";

    console.log("params are ===>", params)

    return res.json({
      success: true,
      paymentUrl,
      formData: params
    });
  } catch (err) {
    console.error("Payment initiation failed:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const payuWebhookStatus = async (req, res) => {
  try {
    let data;

    if (typeof req.body === "string") {
      // Form-encoded data as a string
      data = Object.fromEntries(new URLSearchParams(req.body).entries());
    } else if (req.headers["content-type"]?.includes("application/json")) {
      // JSON payload
      data = req.body;
    } else if (req.body && typeof req.body === "object") {
      // Already parsed by Express or PayU sent without headers
      data = req.body;
    } else {
      // Fallback to empty object (to avoid crashes)
      data = {};
      console.error("Error fetching data from payu")
    }

    console.log("🔔 PayU Webhook Received:", data);

    const savedata = new payuResponse({
      response: data,
      email: data?.email || ''
    });
    await savedata.save();

    // Extract data from POST body
    const {
      bank_ref_num,
      status,
      key,
      txnid,
      amount,
      productinfo,
      firstname,
      mihpayid,
      addedon,
      mode,
      email,
      udf1,
      hash,
    } = data

    const startDate = new Date(addedon);

    // Add one year for subscriptionEnd
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    const redirectUrl =
      status === "success" || status === "captured"
        ? `https://restaurantmandi.com/register/payment-success`
        : `https://restaurantmandi.com/register/payment-failure`;

    if (status === "success" || status === "captured") {

      if (data.udf2 == "supplier") {
        const update = await Vendor.findByIdAndUpdate(udf1, {
          $set: {
            subscription_status: "active",
          },
        });
      }
      const updatedVendor = await Vendor.findByIdAndUpdate(udf1,
        {
          $set: {
            isPayment: true,
            status: 1,
            payuResponse: {
              bankRefNumber: bank_ref_num,
              email: email,
              hash: hash,
              key: key,
              status: status,
              txnId: txnid,
              mihpayid: mihpayid,
              paymentMode: mode,
              amount: amount,
              subscriptionStart: startDate,
              subscriptionEnd: endDate
            },
          },
        },
        {
          new: true
        }
      );
      console.log("✅ Payment Successful for txnid:", txnid);
      return res.redirect(redirectUrl);
    } else {
      console.log("❌ Payment Failed for txnid:", txnid);
      if (data.udf2 == "supplier") {
        const update = await Vendor.findByIdAndUpdate(udf1, {
          $set: {
            subscription_status: "inactive",
          },
        });
      }
      await Vendor.findByIdAndUpdate(udf1,
        {
          $set: {
            isPayment: false,
            status: 1,
            payuResponse: {
              bankRefNumber: bank_ref_num || null,
              email: email,
              hash: hash,
              key: key,
              status: status,
              txnId: txnid,
            },
          },
        }
      );
      return res.redirect(redirectUrl);
    }
  } catch (error) {
    console.error("🚨 PayU Webhook Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function getPayuAccessToken() {
  try {
    console.log("inside getPayuAccessToken")
    console.log("PAYU_CLIENT_ID-->", process.env.PAYU_CLIENT_ID)
    console.log("PAYU_CLIENT_SECRET-->", process.env.PAYU_CLIENT_SECRET)

    const response = await axios.post(
      "https://accounts.payu.in/oauth/token", // PayU's token endpoint
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.PAYU_CLIENT_ID, // Your specific client ID from PayU
        client_secret: process.env.PAYU_CLIENT_SECRET, // Your secret from PayU
        scope: "create_payment_links",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("------- first----", response);
    return response.data.access_token;
  } catch (error) {
    console.error("Error getting PayU access token:", error.response.data);
    throw new Error("Could not authenticate with PayU.");
  }
}

async function generatePaymentLink(accessToken, sup_id, name, email, mobile) {
  const linkPayload = {
    merchant_id: process.env.PAYU_MERCHANT_ID,
    transaction_id: `TXN-${Date.now()}`,
    subAmount: process.env.SUBSCRIPTION_AMOUNT,
    product_info: `Waayu`,
    customer: {
      name: name,
      email: email,
      phone: mobile,
    },
    description: `Payment for Waayu`,
    source: "API",

    udf: {
      udf1: sup_id,
      udf2: "supplier",
      udf3: "",
      udf4: "",
      udf5: "",
    },
  };

  const response = await axios.post(
    "https://oneapi.payu.in/payment-links",
    linkPayload,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        merchantId: process.env.PAYU_MERCHANT_ID,
      },
    }
  );

  const paymentLink = response?.data?.result?.paymentLink;
  const lastLink = paymentLink.split("/");
  const linkText = lastLink[lastLink.length - 1];
  return { paymentLink, linkText };
}

async function createPayuPaymentLink(req, res) {
  try {
    const sup_id = req.body.sup_id;
    const subscription_plan = req.body.subscription_plan;
    const name = req.body.name;
    const email = req.body.email;
    const mobile = req.body.mobile;

    if (subscription_plan == "postpaid") {
      await Vendor.findOneAndUpdate(
        { email: email },
        {
          $set: {
            subscription_plan: subscription_plan,
            subscription_status: "active"
          },
        }
      );
      return res.status(200).json({
        message: "subscription stored",
        success: true
      })
    }

    const accessToken = await getPayuAccessToken();

    const { paymentLink, linkText } = await generatePaymentLink(accessToken, sup_id, name, email, mobile);
    await Vendor.findOneAndUpdate(
      { email: email },
      {
        $set: {
          subscription_plan: subscription_plan,
          subscription_status: "pending"
        },
      }
    );
    const paymentLinkMail = await sendLinkOnMail(paymentLink, email);
    const whatsappResult = await sendLinkOnWhatsapp(mobile, linkText, name);
    return res.status(200).json({
      message: "payment link sent",
      payment_link: paymentLink,
      success: true
    })
  } catch (error) {
    console.error(
      "Error creating PayU payment link:",
      error.response ? error.response.data : error.message
    );
    throw new Error("Could not generate payment link.");
  }
}

async function sendLinkOnWhatsapp(number, text, firstname) {
  try {
    if (number !== "") {
      console.log("number ---> ", number);
      console.log("text ---> ", text);
      const url = `https://api.interakt.ai/v1/public/message/`;
      // const url = `https://api.interakt.ai/v1/public/track/events/`;
      let YOUR_API_KEY = "WFlWc2FUTzhRbWNTZzJ1V0llS2hmS1ZURTEtY01kYjRkcXdBcUhOOEVrczo=";

      let numberBody = {
        userId: `${number}_${Date.now()}`,
        phoneNumber: number,
        countryCode: "+91",
        traits: {
          name: firstname,
        },
      };
      console.log("numberBody-->", numberBody)
      let numberHeaders = {
        "content-type": "application/json",
        Authorization: `Basic ${YOUR_API_KEY}`,
      };

      const NumberResponse = await axios.post("https://api.interakt.ai/v1/public/track/users/", numberBody, { headers: numberHeaders });
      console.log("NumberResponse-->", NumberResponse?.data);
      //  let body = {
      //    phoneNumber: number,
      //    countryCode: "+91",
      //    event: "Leadzilla Subscription",
      //    traits: {
      //      customer_language: "english",
      //      easebuzz_link: text,
      //    },
      //  };
      let body = {
        countryCode: "+91",
        phoneNumber: number,
        type: "Template",
        template: {
          name: "send_payu_link",
          languageCode: "en",
          // bodyValues: [
          //   "mithilesh.singpure@desteksolutions.com",
          //   "7448290148",
          // ],
          buttonValues: {
            0: [text],
          },
        },
      };
      let headers = {
        "content-type": "application/json",
        Authorization: `Basic ${YOUR_API_KEY}`,
      };
      const response = await axios.post(url, body, { headers });
      console.log("API Response:", response?.data);
      return response?.data;
    }
  } catch (error) {
    console.log("error in whatsapp message ---> ", error);
  }
}

async function sendLinkOnMail(message, email) {
  try {
    const EMAIL = process.env.EMAIL || "contact@restaurantmandi.com"
    const PASSWORD = process.env.EMAIL_APP_PASSWORD || "Business@1234"

    const mailOptions = {
      from: EMAIL,
      to: email,
      subject: "Subscription Payment Link",
      text: "WAAYU, Subscription Payment Link!",
      html: `Please click on the link to pay ${message}`,
    };

    const transporter = nodemailer.createTransport({
      host: 'smtpout.secureserver.net',
      port: 465,
      secure: true,
      auth: {
        user: EMAIL,
        pass: PASSWORD
      }
    });

    const info = await transporter.sendMail(mailOptions);
    console.log("info-->", info);
    return true;
  } catch (error) {
    console.log("error-->", error.messe);
  }
}

module.exports = {
  getPayuAccessToken,
  generatePaymentLink,
  initiatePayUPayment,
  payuWebhookStatus,
  createPayuPaymentLink
}