const asyncHandler = require("express-async-handler");
const moment = require("moment-timezone");
const axios = require("axios");

const Enquiry = require("../models/enquiryModel");
const Vendor = require("../models/vendorModel");
const Product = require("../models/productModel");
const Customer = require("../models/customerModel");
const Chat = require("../models/chatModel");

const nodemailer = require("nodemailer");

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
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL,
//     pass: process.env.EMAIL_APP_PASSWORD,
//   },
// });


const sendEnquiryMail = async (to, productName, quantity, unit) => {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h2 style="color: #1e3a8a; text-align: center;">🟢 New Enquiry Received</h2>
          <p style="font-size: 16px; color: #374151;">
            Hello Vendor,
          </p>
          <p style="font-size: 16px; color: #374151;">
            You’ve received a new enquiry through <strong>Waayu Restaurant Mandi</strong>.
          </p>

          <table style="width:100%; border-collapse: collapse; margin-top: 20px;">
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Product</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${productName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Quantity</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${quantity || "N/A"} ${unit}</td>
            </tr>
          </table>

          <p style="font-size: 16px; color: #374151; margin-top: 20px;">
            Please check your vendor dashboard for full enquiry details.
          </p>

          <p style="margin-top: 30px; text-align: center; color: #6b7280;">
            — Waayu Restaurant Mandi Team
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL,
      to,
      subject: "New Enquiry Received",
      html: htmlContent,
    });

    console.log("Enquiry email sent successfully to:", to);
  } catch (error) {
    console.error("Error sending enquiry email:", error.message);
  }
};

const sendEnquiryOnWhatsApp = async (data) => {
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
      "name": `${data.user_name || ""}`
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
      "name": "restaurant_mandi_enquiry",
      "languageCode": "en",
      "bodyValues": [
        `${data.product || "NA"}`,
        `${data.quantity || "NA"}`
      ]
    }
  }

  await axios.post("https://api.interakt.ai/v1/public/message/", sendTemplatePayload, { headers })
}

// Create
const createEnquiry = asyncHandler(async (req, res) => {
  const data = req.body;

  if (!data.customerId) {
    return res
      .status(500)
      .json({ message: "Please provide the customerId", success: false });
  }

  if (!data.productId) {
    return res
      .status(500)
      .json({ message: "Please provide the productId", success: false });
  }
  if (!data.vendorId) {
    return res
      .status(500)
      .json({ message: "Please provide the vendorId", success: false });
  }
  if (!data.quantity) {
    return res
      .status(500)
      .json({ message: "Please provide the quantity", success: false });
  }
  if (!data.unit) {
    return res
      .status(500)
      .json({ message: "Please provide the unit", success: false });
  }

  const enquiry = await Enquiry.create(data);

  if (!enquiry) {
    return res
      .status(500)
      .json({ message: "Error while creating enquiry!", success: false });
  }

  // Fetch vendor, product, and customer details
  const [vendor, product, customer] = await Promise.all([
    Vendor.findById(data.vendorId),
    Product.findById(data.productId),
    Customer.findById(data.customerId),
  ]);

  if (!vendor) {
    return res.status(404).json({ message: "Vendor not found", success: false });
  }
  if (!product) {
    return res.status(404).json({ message: "Product not found", success: false });
  }
  if (!customer) {
    return res.status(404).json({ message: "Customer not found", success: false });
  }

  console.log("product is===> ", product)

  // Compose message
  const messageText = `*New Enquiry Alert!*

📦 *Product:* ${product.productName}
📦 *Quantity:* ${data.quantity || "N/A"}

👤 *Customer:* ${customer.name}
📱 *Mobile:* ${customer.mobile}

Please check your dashboard for more details.`;



  try {
    // Send WhatsApp message to vendor
    const whatsAppData = {
      "phone_number": vendor.mobile,
      "user_name": customer.name,
      "product": product.productName,
      "quantity": `${data.quantity} ${data.unit}`
    }

    await sendEnquiryOnWhatsApp(whatsAppData);

    // Send Email
    await sendEnquiryMail(
      vendor.email,
      product.productName,
      data.quantity,
      data.unit
    );
  } catch (error) {
    console.error("Notification error:", error.message);
  }
  res.status(201).send(enquiry);
});

// Get All
const getAllEnquiries = asyncHandler(async (req, res) => {
  const page = parseInt(req?.query?.page) || 1;
  const vendorId = req.query.vendorId;
  const limit = 8;
  const skip = (page - 1) * limit;

  const enquiries = await Enquiry.find({ vendorId })
    .populate({
      path: "customerId",
      select: "name mobile",
    })
    .populate({
      path: "productId",
      select: "productName productImage",
    })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  if (!enquiries || enquiries.length === 0) {
    return res
      .status(404)
      .json({ message: "No Enquiry Found!", success: false });
  }

  const totalEnquiries = await Enquiry.countDocuments({ vendorId });

  const basePath = `${process.env.APP_BASE_URL}/uploads/images/product/`

  const modifiedEnquiries = enquiries.map((enquiry) => {
    const product = enquiry.productId;

    if (product?.productImage?.length > 0) {
      product.productImage = product.productImage.map((img) => {
        // Only prepend base path if it's a filename (not already a URL)
        if (typeof img === "string" && !img.startsWith("http")) {
          return `${basePath}${img}`;
        }
        return img;
      });
    }

    return enquiry;
  });

  const data = {
    totalEnquiries,
    enquiries: modifiedEnquiries,
  };

  res.status(200).json({ data, success: true });
});


// Get Single
const getSingleEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findById(req.params.id).populate({
    path: "productId",
    select: "productName productImage vendorId",
  });

  if (!enquiry) {
    return res
      .status(404)
      .json({ message: "No Enquiry Found!", success: false });
  }

  const vendorId = enquiry.productId.vendorId;

  // Fetch the vendor data
  const vendor = await Vendor.findById(vendorId).select("mobile");

  const result = {
    _id: enquiry._id,
    customerId: enquiry.customerId,
    productId: enquiry.productId._id,
    productName: enquiry.productId.productName,
    productImage:
      `${process.env.APP_BASE_URL}/uploads/images/product/${enquiry.productId.productImage[0]}`
        ? `${process.env.APP_BASE_URL}/uploads/images/product/${enquiry.productId.productImage[0]}`
        : "",
    mobile: vendor ? vendor.mobile : "",
    quantity: enquiry.quantity ? enquiry.quantity : "",
    unit: enquiry.unit ? enquiry.unit : "",
    comment: enquiry.comment ? enquiry.comment : "",
  };

  res.status(200).json({ data: result, success: true });
});

// Update
const updateEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  })
    .populate({
      path: "customerId",
      select: "name mobile",
    })
    .populate({
      path: "productId",
      select: "productName productImage",
    });

  if (!enquiry) {
    return res
      .status(404)
      .json({ message: "No Enquiry Found!", success: false });
  }

  res.status(200).json({ data: enquiry, success: true });
});

// Delete
const deleteEnquiry = asyncHandler(async (req, res) => {
  const enquiryId = req?.params?.id;

  if (!enquiryId) {
    return res
      .status(400)
      .json({ message: "Please provide the enquiry Id.", success: false });
  }

  const enquiry = await Enquiry.findById(enquiryId);

  if (!enquiry) {
    return res
      .status(404)
      .json({ message: "Enquiry Not Found!", success: false });
  }

  await Enquiry.deleteOne({ _id: enquiryId });

  res.status(200).json({ success: true });
});

// Get Read Enquiries
const getReadEnquiries = asyncHandler(async (req, res) => {
  const page = parseInt(req?.query?.page) || 1;
  const vendorId = req.query.vendorId;

  if (!vendorId) {
    return res
      .status(400)
      .json({ message: "Please provide the vendor Id.", success: false });
  }
  const limit = 8;
  const skip = (page - 1) * limit;

  const enquiries = await Enquiry.find({ isRead: true, vendorId: vendorId })
    .populate({
      path: "customerId",
      select: "name mobile",
    })
    .populate({
      path: "productId",
      select: "productName productImage",
    })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  if (!enquiries || enquiries.length === 0) {
    return res
      .status(404)
      .json({ message: "No Enquiry Found!", success: false });
  }

  const totalEnquiries = await Enquiry.find({
    isRead: true,
    vendorId: vendorId,
  }).countDocuments();

  const data = {
    totalEnquiries,
    enquiries,
  };

  res.status(200).json({ data, success: true });
});

// Get Un-Read Enquiries
const getUnReadEnquiries = asyncHandler(async (req, res) => {
  const page = parseInt(req?.query?.page) || 1;
  const vendorId = req.query.vendorId;

  if (!vendorId) {
    return res
      .status(400)
      .json({ message: "Please provide the vendor Id.", success: false });
  }

  const limit = 8;
  const skip = (page - 1) * limit;

  const enquiries = await Enquiry.find({ isRead: false, vendorId: vendorId })
    .populate({
      path: "customerId",
      select: "name mobile",
    })
    .populate({
      path: "productId",
      select: "productName productImage",
    })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  if (!enquiries || enquiries.length === 0) {
    return res
      .status(404)
      .json({ message: "No Enquiry Found!", success: false });
  }

  const totalEnquiries = await Enquiry.find({
    isRead: false,
    vendorId: vendorId,
  }).countDocuments();

  const data = {
    totalEnquiries,
    enquiries,
  };

  res.status(200).json({ data, success: true });
});

// Filter All
const filterEnquiries = asyncHandler(async (req, res) => {
  const page = parseInt(req?.query?.page) || 1;
  const vendorId = req.query.vendorId;

  if (!vendorId) {
    return res
      .status(400)
      .json({ message: "Please provide the vendor Id.", success: false });
  }

  const limit = 8;
  const skip = (page - 1) * limit;

  const enquiryStatus = req.query.q;

  let query;

  if (enquiryStatus === "all") {
    query = { vendorId: vendorId };
  } else if (!enquiryStatus) {
    return res
      .status(400)
      .json({ message: "Please provide the enquiry status.", success: false });
  } else {
    query = {
      enquiryStatus: { $regex: enquiryStatus, $options: "i" },
      vendorId: vendorId,
    };
  }

  const enquiries = await Enquiry.find(query)
    .populate({
      path: "customerId",
      select: "name mobile",
    })
    .populate({
      path: "productId",
      select: "productName productImage",
    })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  if (!enquiries || enquiries.length === 0) {
    return res
      .status(404)
      .json({ message: "No Enquiry Found!", success: false });
  }

  const totalEnquiries = await Enquiry.find(query).countDocuments();

  const data = {
    totalEnquiries,
    enquiries,
  };

  res.status(200).json({ data, success: true });
});

// Filter Read Enquiries
const filterReadEnquiries = asyncHandler(async (req, res) => {
  const page = parseInt(req?.query?.page) || 1;
  const limit = 8;
  const skip = (page - 1) * limit;
  const vendorId = req.query.vendorId;

  if (!vendorId) {
    return res
      .status(400)
      .json({ message: "Please provide the vendor Id.", success: false });
  }

  const enquiryStatus = req.query.q;

  let query;

  if (enquiryStatus === "all") {
    query = {
      isRead: true,
      vendorId: vendorId,
    };
  } else if (!enquiryStatus) {
    return res
      .status(400)
      .json({ message: "Please provide the enquiry status.", success: false });
  } else {
    query = {
      enquiryStatus: { $regex: enquiryStatus, $options: "i" },
      isRead: true,
      vendorId: vendorId,
    };
  }

  const enquiries = await Enquiry.find(query)
    .populate({
      path: "customerId",
      select: "name mobile",
    })
    .populate({
      path: "productId",
      select: "productName productImage",
    })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  if (!enquiries || enquiries.length === 0) {
    return res
      .status(404)
      .json({ message: "No Enquiry Found!", success: false });
  }

  const totalEnquiries = await Enquiry.find(query).countDocuments();

  const data = {
    totalEnquiries,
    enquiries,
  };

  res.status(200).json({ data, success: true });
});

// Filter Un-Read Enquiries
const filterUnReadEnquiries = asyncHandler(async (req, res) => {
  const page = parseInt(req?.query?.page) || 1;
  const limit = 8;
  const skip = (page - 1) * limit;

  const vendorId = req.query.vendorId;

  if (!vendorId) {
    return res
      .status(400)
      .json({ message: "Please provide the vendor Id.", success: false });
  }

  const enquiryStatus = req.query.q;

  let query;

  if (enquiryStatus === "all") {
    query = { isRead: false, vendorId: vendorId };
  } else if (!enquiryStatus) {
    return res
      .status(400)
      .json({ message: "Please provide the enquiry status.", success: false });
  } else {
    query = {
      enquiryStatus: { $regex: enquiryStatus, $options: "i" },
      isRead: false,
      vendorId: vendorId,
    };
  }

  const enquiries = await Enquiry.find(query)
    .populate({
      path: "customerId",
      select: "name mobile",
    })
    .populate({
      path: "productId",
      select: "productName productImage",
    })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  if (!enquiries || enquiries.length === 0) {
    return res
      .status(404)
      .json({ message: "No Enquiry Found!", success: false });
  }

  const totalEnquiries = await Enquiry.find(query).countDocuments();

  const data = {
    totalEnquiries,
    enquiries,
  };

  res.status(200).json({ data, success: true });
});

// Get Customer Enquiry For Mobile
const customerEnquiry = asyncHandler(async (req, res) => {
  const customerId = req.query.custId;
  const status = req.query.status;
  let sortQuery;

  if (status == "old") {
    sortQuery = { createdAt: 1 };
  } else {
    sortQuery = { createdAt: -1 };
  }

  const enquiries = await Enquiry.find({ customerId })
    .populate({
      path: "productId",
      select: "_id productName productImage vendorId isService",
    })
    .sort(sortQuery);

  if (!enquiries || enquiries.length === 0) {
    return res.status(200).send([]);
  }

  const transformedEnquiry = await Promise.all(
    enquiries.map(async (enquiry) => {
      if (!enquiry?.productId) {
        // Skip this enquiry if productId is null
        return null;
      }

      const vendorId = enquiry.productId.vendorId;

      let vendorMobile = "";
      let vendorName = "";
      let vendorCity = "";
      let isPayment = "";
      let vendor=undefined;
      if (vendorId) {
        // Fetch the vendor data if vendorId is present
        vendor = await Vendor.findById(vendorId).select(
          "mobile businessDetails city isPayment locationDetails lastOnline"
        );
        vendorMobile = vendor ? vendor.mobile : "";
        vendorName = vendor ? vendor.businessDetails.businessName : "";
        vendorCity = vendor ? vendor.locationDetails?.city : "";
        isPayment = vendor ? vendor.isPayment : "";
      }

      // Count unread chats for this enquiry for the customer
      const unreadCount = await Chat.countDocuments({
        customerId: enquiry.customerId,
        enquiryId: enquiry._id,
        seenByCustomerAt: null,
      });

      return {
        _id: enquiry._id,
        customerId: enquiry.customerId,
        productId: enquiry.productId._id,
        vendorId: enquiry.productId.vendorId,
        vendorName: vendorName,
        productName: enquiry.productId.productName,
        productImage:
          enquiry.productId.productImage.length > 0
            ? `${process.env.APP_BASE_URL}/uploads/images/product/${enquiry.productId.productImage[0]}`
            : "",
        mobile: vendorMobile,
        city: vendorCity,
        isSubscribed: isPayment || false,
        quantity: enquiry.quantity || "",
        unit: enquiry.unit || "",
        isService: enquiry.productId.isService || false,
        comment: enquiry.comment || "",
        unreadCount,
        // createdAt: moment(enquiry.createdAt)
        //   .tz("Asia/Calcutta")
        //   .format("YYYY-MM-DD HH:mm:ss"),
        createdAt: enquiry.createdAt,
        lastOnline: vendor.lastOnline,
      };
    })
  );

  // Filter out any null values from the transformedEnquiry array
  const filteredEnquiry = transformedEnquiry.filter((item) => item !== null);

  res.status(200).send(filteredEnquiry);
});

function splitAndFormatDate(dateStr) {
  // Create a Date object from the ISO date string
  const date = new Date(dateStr);

  // Extract individual components
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0"); // getUTCMonth() is zero-based
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  // Format as MM/DD/YYYY HH:MM:SS
  const formattedDate = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

  return formattedDate;
}

// Search Enquiry
const searchEnquiry = asyncHandler(async (req, res) => {
  try {
    const q = req.query.q;
    const page = parseInt(req?.query?.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;

    console.log("Search query:", q);

    const regexQuery = new RegExp(q, "i");

    const enquiries = await Enquiry.aggregate([
      {
        $lookup: {
          from: "customers", // Assuming the name of the customers collection
          localField: "customerId",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $lookup: {
          from: "products", // Assuming the name of the products collection
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $match: {
          $or: [
            { "product.productName": { $regex: regexQuery } },
            { "customer.name": { $regex: regexQuery } },
          ],
        },
      },
      {
        $addFields: {
          customer: { $arrayElemAt: ["$customer", 0] },
          product: { $arrayElemAt: ["$product", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          quantity: 1,
          comment: 1,
          enquiryStatus: 1,
          isRead: 1,
          customer: { name: "$customer.name", mobile: "$customer.mobile" },
          product: {
            productName: "$product.productName",
            productImage: "$product.productImage",
          },
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    // console.log("Enquiries found:", enquiries);

    if (!enquiries || enquiries.length === 0) {
      return res
        .status(404)
        .json({ message: "No Enquiry Found!", success: false });
    }

    const data = {
      totalEnquiries: enquiries.length,
      enquiries,
      success: true,
    };

    res.status(200).send(data);
  } catch (error) {
    console.error("Error searching enquiries:", error.message);
    res.status(500).json({ message: "Internal server error", success: false });
  }
});

// Get count of enquiries with non-zero unreadCount for a customer
const unreadEnquiryCount = asyncHandler(async (req, res) => {
  const customerId = req.query.custId;

  if (!customerId) {
    return res
      .status(400)
      .json({ message: "Please provide the customer Id.", success: false });
  }

  const enquiryIdsWithUnread = await Chat.distinct("enquiryId", {
    customerId: customerId,
    seenByCustomerAt: null,
  });

  const enquiries = await Enquiry.find({ _id: { $in: enquiryIdsWithUnread } });

  return res.status(200).json({ count: enquiries.length, success: true });
});

module.exports = {
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
};
