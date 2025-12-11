const asyncHandler = require("express-async-handler");
const moment = require("moment-timezone");
const admin = require("firebase-admin");

const Customer = require("../models/customerModel");
const Notification = require("../models/notificationModel");
const Product = require("../models/productModel");

const serviceAccountAndroid = require("../restaurant-mandi-android-firebase-adminsdk-fbsvc-3ad68ed50d.json");
const serviceAccountIOS = require("../waayumarketplace-firebase-adminsdk-fbsvc-9dac62ed87.json");

const adminIOS = admin.initializeApp(
  {
    credential: admin.credential.cert(serviceAccountIOS),
  },
  "iosApp"
);

const adminAndroid = admin.initializeApp(
  {
    credential: admin.credential.cert(serviceAccountAndroid),
  },
  "androidApp"
);

const sendEnquiryNotification = asyncHandler(async (req, res) => {
  const { customerId, vendorId, enquiryId } = req.body;

  if (!customerId || !vendorId || !enquiryId) {
    return res
      .status(400)
      .json({ message: "Please fill all the fields", success: false });
  }

  const userTitle = "Enquiry Raised!!";
  const userMsg = `Your enquiry has been raised successfully.`;

  // const userMessage = {
  //   notification: {
  //     title: userTitle,
  //     body: userMsg,
  //   },
  // };

  const userMessage = {
    data: {
      title: userTitle,
      body: userMsg,
      type: "enquiry",
      enquiryId: enquiryId,
      vendorId: vendorId,
      customerId: customerId,
      click_action: "FLUTTER_NOTIFICATION_CLICK"
    }
  };

  await Notification.create({
    customerId,
    vendorId,
    enquiryId,
    title: userTitle,
    description: userMsg,
  });

  const customer = await Customer.findById(customerId);
  if (!customer) {
    return res
      .status(404)
      .json({ message: "Customer not found", success: false });
  }

  // Collect all valid FCM IDs from the devices array
  const fcmIdArray = (customer.devices || [])
    .map((d) => d.fcmId)
    .filter((id) => !!id); // remove null/undefined/empty

  if (fcmIdArray.length === 0) {
    console.log(`⚠️ No FCM IDs found for customer ${customerId}`);
    return res.status(200).json({
      message: "Notification saved (no FCM ID to send).",
      success: true,
    });
  }

  console.log("📱 Sending notification to:", fcmIdArray);

  await sendMessageFCM(fcmIdArray, userMessage);

  res
    .status(200)
    .json({ message: "Notification sent successfully", success: true });
});

async function sendMessageFCM(fcmIdArray, messageData) {
  if (!Array.isArray(fcmIdArray) || fcmIdArray.length === 0) return;

  // Split tokens into Android and iOS if needed
  // Here we assume the tokens may contain platform info if needed
  // If not, you can just try Android first, fallback to iOS
  const promises = fcmIdArray.map(async (fcmToken) => {
    if (!fcmToken) return;

    const payload = {
      token: fcmToken,
      data: messageData.data || {},
      android: {
        priority: "high",
      },
      apns: {
        headers: { "apns-priority": "10" },
        payload: {
          aps: {
            alert: {
              title: messageData.title,
              body: messageData.body,
            },
            sound: "default",
          },
        },
      },
    };

    try {
      // First try sending via Android app instance
      const responseAndroid = await adminAndroid.messaging().send(payload);
      console.log(`✅ Android message sent to token: ${fcmToken}`);
      return responseAndroid;
    } catch (errAndroid) {
      console.warn(`⚠️ Android send failed for ${fcmToken}: ${errAndroid.message}`);

      try {
        // Fallback to iOS
        const iosPayload = {
          ...payload,
          notification: {
            title: messageData.data?.title || "Notification",
            body: messageData.data?.body || "",
          },
          data: messageData.data || {},
          apns: {
            headers: { "apns-priority": "10" },
            payload: {
              aps: {
                alert: {
                  title: messageData.data?.title || "Notification",
                  body: messageData.data?.body || "",
                },
                sound: "default",
                contentAvailable: true,
              },
            },
          },
        };
        const responseIOS = await adminIOS.messaging().send(iosPayload);
        console.log(`🍎 iOS message sent to token: ${fcmToken}`);
        return responseIOS;
      } catch (errIOS) {
        console.error(`❌ Both sends failed for token ${fcmToken}: ${errIOS.message}`);
      }
    }
  });

  await Promise.all(promises);
  console.log(`📨 Finished sending FCM messages to ${fcmIdArray.length} token(s)`);
}

const listCustomerNotifications = asyncHandler(async (req, res) => {
  const { customerId } = req.body;

  if (!customerId) {
    return res
      .status(400)
      .json({ message: "Please provide customer id", success: false });
  }

  const notifications = await Notification.find({ customerId })
    .populate({
      path: "vendorId",
      select: "name profileImage isPayment", // Select specific fields from vendor
    })
    .sort({ createdAt: -1 });

  if (!notifications || notifications.length === 0) {
    return res.status(404).json({
      message: "No notifications found for this customer",
      success: false,
    });
  }

  console.log("Notifications are ===>", notifications)

  const data = notifications.map((notification) => {
    return {
      _id: notification._id,
      vendorId: notification.vendorId?._id,
      vendorName: notification.vendorId?.name,
      image: `${process.env.APP_BASE_URL}/uploads/images/vendor/${notification.vendorId?.profileImage}`,
      customerId: notification.customerId,
      enquiryId: notification.enquiryId,
      title: notification.title,
      description: notification.description,
      // createdAt: moment(notification.createdAt)
      //   .tz("Asia/Calcutta")
      //   .format("YYYY-MM-DD HH:mm:ss"),
      createdAt: notification.createdAt
    };
  });

  res.status(200).json({ data, success: true });
});

const listVendorNotifications = asyncHandler(async (req, res) => {
  const { vendorId } = req.body;

  if (!vendorId) {
    return res
      .status(400)
      .json({ message: "Please provide vendor id", success: false });
  }

  const notifications = await Notification.find({ vendorId })
    .populate({
      path: "vendorId",
      select: "name profileImage", // Select specific fields from vendor
    })
    .populate({
      path: "customerId",
      select: "name profileImage", // Select specific fields from customer
    })
    .populate({
      path: "enquiryId",
      select: "productId", // Select productId from enquiry
    })
    .sort({ createdAt: -1 });

  if (!notifications || notifications.length === 0) {
    return res.status(404).json({
      message: "No notifications found for this vendor",
      success: false,
    });
  }

  const productIds = notifications.map(
    (notification) => notification.enquiryId.productId
  );
  const products = await Product.find({ _id: { $in: productIds } }).select(
    "productName"
  );

  const productMap = products.reduce((map, product) => {
    map[product._id] = product.productName;
    return map;
  }, {});

  const data = notifications.map((notification) => {
    const productName = productMap[notification.enquiryId.productId];
    return {
      _id: notification?._id,
      vendorId: notification?.vendorId?._id,
      vendorName: notification?.vendorId?.name,
      image: `${process.env.APP_BASE_URL}/uploads/images/vendor/${notification?.vendorId?.profileImage}`,
      customerId: notification?.customerId?._id,
      customerName: notification?.customerId?.name,
      enquiryId: notification?.enquiryId?._id,
      title: notification?.title,
      description: `Enquiry has been raised against ${productName}`,
      createdAt: moment(notification?.createdAt)
        .tz("Asia/Calcutta")
        .format("YYYY-MM-DD HH:mm:ss"),
    };
  });

  res.status(200).json({ data, success: true });
});

module.exports = {
  sendEnquiryNotification,
  listCustomerNotifications,
  listVendorNotifications,
  sendMessageFCM,
};

// const axios = require("axios");
// const { JWT } = require("google-auth-library");
// const admin = require("firebase-admin");
// const asyncHandler = require("express-async-handler");

// const Customer = require("../models/customerModel");
// const Notification = require("../models/notificationModel");

// const serviceAccount = require("../market-places-9554d-firebase-adminsdk-qq1uj-068b371c02.json"); // Update with the path to your downloaded service account key file

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

// const projectId = serviceAccount.project_id; // Use the project_id from the service account file

// const sendEnquiryNotification = asyncHandler(async (req, res) => {
//   const { customerId, vendorId, enquiryId } = req.body;

//   if (!customerId || !vendorId || !enquiryId) {
//     return res
//       .status(400)
//       .json({ message: "Please fill all the fields", success: false });
//   }

//   const userTitle = "Enquiry Raised!!";
//   const userMsg = "Your enquiry has been raised successfully.";

//   const userMessage = {
//     message: {
//       notification: {
//         title: userTitle,
//         body: userMsg,
//       },
//       token: "", // Will be filled later
//     },
//   };

//   await Notification.create({
//     customerId,
//     vendorId,
//     enquiryId,
//     title: userTitle,
//     description: userMsg,
//   });

//   const customer = await Customer.findById(customerId);
//   const fcmIdArray = [customer.fcmId];
//   console.log(fcmIdArray);

//   await sendMessageAndroid(fcmIdArray, userMessage);

//   res
//     .status(200)
//     .json({ message: "Notification sent successfully", success: true });
// });

// async function sendMessageAndroid(fcmIdArray, messageData) {
//   const promises = fcmIdArray.map(async (fcmToken) => {
//     const message = {
//       ...messageData,
//       message: {
//         ...messageData.message,
//         token: fcmToken,
//       },
//     };

//     const config = {
//       method: "post",
//       url: `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
//       headers: {
//         Authorization: `Bearer ${await getAccessToken()}`,
//         "Content-Type": "application/json",
//       },
//       data: JSON.stringify(message),
//     };

//     try {
//       const response = await axios(config);
//       console.log(`Message sent successfully to token ${fcmToken}`);
//       return response.data;
//     } catch (error) {
//       console.error(
//         `Error sending message to token ${fcmToken}:`,
//         error.response.data
//       );
//       throw error;
//     }
//   });

//   const results = await Promise.allSettled(promises);

//   results.forEach((result, index) => {
//     if (result.status === "fulfilled") {
//       console.log(`Message sent successfully to token ${fcmIdArray[index]}`);
//     } else {
//       console.log(
//         `Error sending message to token ${fcmIdArray[index]}:`,
//         result.reason
//       );
//     }
//   });
// }

// async function getAccessToken() {
//   const client = new JWT({
//     email: serviceAccount.client_email,
//     key: serviceAccount.private_key,
//     scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
//   });

//   const token = await client.authorize();
//   return token.access_token;
// }

// module.exports = { sendEnquiryNotification };
