const asyncHandler = require("express-async-handler");
const moment = require("moment-timezone");

const Chat = require("../models/chatModel");
const Enquiry = require("../models/enquiryModel");
const Vendor = require("../models/vendorModel");

// Get All
// const getVendorChats = asyncHandler(async (req, res) => {
//   const vendorId = req.query.vendorId;

//   // Fetch all chats for the vendor, sorted by createdAt in descending order
//   const chats = await Chat.find({ vendorId })
//     .populate({
//       path: "customerId",
//       select: "name mobile",
//     })
//     .populate("enquiryId")
//     .sort({ createdAt: -1 });

//   if (!chats || chats.length === 0) {
//     return res.status(404).json({ message: "No Chat Found!", success: false });
//   }

//   // Create a map to hold the latest chat for each customer and their chat counts
//   const latestChatsMap = new Map();
//   const chatCounts = {};

//   for (const chat of chats) {
//     const customerId = chat.customerId?._id.toString();

//     // Count the number of chats per customer
//     if (chatCounts[customerId]) {
//       chatCounts[customerId]++;
//     } else {
//       chatCounts[customerId] = 1;
//     }

//     // Store the latest chat for each customer
//     if (!latestChatsMap.has(customerId)) {
//       latestChatsMap.set(customerId, chat);
//     }
//   }

//   // Extract unique latest chats
//   const uniqueLatestChats = Array.from(latestChatsMap.values());

//   // Extract all enquiry IDs from unique latest chats
//   const enquiryIds = uniqueLatestChats.map((chat) => chat.enquiryId?._id);

//   // Fetch all related enquiries including product details
//   const enquiries = await Enquiry.find({ _id: { $in: enquiryIds } }).populate(
//     "productId"
//   );

//   // Map data for response
//   const data = uniqueLatestChats.map((chat) => {
//     const enquiry = enquiries.find((e) => e?._id.equals(chat.enquiryId?._id));
//     return {
//       _id: chat?._id,
//       enquiryId: chat.enquiryId?._id ? chat.enquiryId?._id : "",
//       customerId: chat.customerId?._id,
//       customerName: chat.customerId?.name,
//       customerMobile: chat.customerId?.mobile,
//       productName: enquiry ? enquiry.productId.productName : "",
//       message: chat.message,
//       image: enquiry
//         ? `${process.env.APP_BASE_URL}/uploads/images/product/${enquiry.productId.productImage[0]}`
//         : null,
//       createdAt: chat.createdAt,
//       count: chatCounts[chat.customerId?._id.toString()], // Add the count of chats for the customer
//     };
//   });

//   res.status(200).json({ data, success: true });
// });

const getVendorChats = asyncHandler(async (req, res) => {
  const { vendorId, search } = req.query;

  // Fetch all chats for the vendor, sorted by createdAt in descending order
  let chats = await Chat.find({ vendorId })
    .populate({
      path: "customerId",
      select: "name mobile",
    })
    .populate({
      path: "enquiryId",
      populate: {
        path: "productId",
        populate: {
          path: "categoryId",
          select: "categoryName",
        },
      },
    })
    .sort({ createdAt: -1 });

  if (!chats || chats.length === 0) {
    return res.status(404).json({ message: "No Chat Found!", success: false });
  }

  // Convert search to lowercase for case-insensitive filtering
  const searchLowerCase = search ? search.toLowerCase() : "";

  // Filter chats based on customer name or product name
  chats = chats.filter((chat) => {
    const customerName = chat.customerId?.name?.toLowerCase() || "";
    const productName = chat.enquiryId?.productId?.productName?.toLowerCase() || "";

    return (
      customerName.includes(searchLowerCase) ||
      productName.includes(searchLowerCase)
    );
  });

  // Handle case where no chats match the search criteria
  if (chats.length === 0) {
    return res.status(404).json({ message: "No Chat Found!", success: false });
  }

  // ✅ Group chats by enquiryId and compute counts
  const groupedByEnquiry = chats.reduce((acc, chat) => {
    const enquiryId = chat.enquiryId?._id?.toString();
    if (!enquiryId) return acc;
    if (!acc[enquiryId]) acc[enquiryId] = { list: [], unreadCount: 0 };
    acc[enquiryId].list.push(chat);
    if (!chat.seenByVendorAt) acc[enquiryId].unreadCount++;
    return acc;
  }, {});

  // ✅ Prepare final data array
  const data = Object.values(groupedByEnquiry)
    .map((group) => {
      const latestChat = group.list[0]; // since chats are sorted desc by createdAt
      const count = group.list.length;

      if (count === 0) return null; // skip empty groups

      const enquiry = latestChat.enquiryId;
      const product = enquiry?.productId;

      return {
        _id: latestChat._id,
        enquiryId: enquiry?._id || "",
        customerId: latestChat.customerId?._id,
        customerName: latestChat.customerId?.name,
        customerMobile: latestChat.customerId?.mobile,
        vendorId: latestChat.vendorId?._id,
        vendorName: latestChat.vendorId?.name,
        vendorImage: latestChat.vendorId?.profileImage
          ? `${process.env.APP_BASE_URL}/uploads/images/vendor/${latestChat.vendorId.profileImage}`
          : "",
        vendorMobile: latestChat.vendorId?.mobile || "",
        productName: product?.productName || "",
        categoryName: product?.categoryId?.categoryName || "",
        message: latestChat.message,
        image: product?.productImage?.length
          ? `${process.env.APP_BASE_URL}/uploads/images/product/${product.productImage[0]}`
          : null,
        createdAt: latestChat.createdAt,
        count, // number of chats in this enquiry
        unreadCount: group.unreadCount,
      };
    })
    .filter(Boolean); // remove nulls

  // ✅ Filter out groups with zero chats
  const filteredData = data.filter((item) => item.count > 0);

  res.status(200).json({ data: filteredData, success: true });
});


// const getCustomerChats = asyncHandler(async (req, res) => {
//   const { customerId, search } = req.query;

//   // Fetch all chats for the customer, sorted by createdAt in descending order
//   let chats = await Chat.find({ customerId })
//     .populate({
//       path: "customerId",
//       select: "name mobile",
//     })
//     .populate({
//       path: "enquiryId",
//       populate: {
//         path: "productId",
//         populate: {
//           path: "categoryId",
//           select: "categoryName",
//         },
//       },
//     })
//     .populate({
//       path: "vendorId",
//       select: "name profileImage mobile",
//     })
//     .sort({ createdAt: -1 });

//   if (!chats || chats.length === 0) {
//     return res.status(404).json({ message: "No Chat Found!", success: false });
//   }

//   // Convert search to lower case for case-insensitive comparison
//   const searchLowerCase = search ? search.toLowerCase() : "";

//   // Filter chats based on search criteria
//   chats = chats.filter((chat) => {
//     const customerName = chat.customerId.name.toLowerCase();
//     const productName = chat.enquiryId.productId.productName.toLowerCase();

//     return (
//       customerName.includes(searchLowerCase) ||
//       productName.includes(searchLowerCase)
//     );
//   });

//   // Handle case where no chats match the search criteria
//   if (chats.length === 0) {
//     return res.status(404).json({ message: "No Chat Found!", success: false });
//   }

//   // Create a map to hold the latest chat for each customer and their chat counts
//   const latestChatsMap = new Map();
//   const chatCounts = {};

//   for (const chat of chats) {
//     const customerId = chat.customerId._id.toString();

//     // Count the number of chats per customer
//     if (chatCounts[customerId]) {
//       chatCounts[customerId]++;
//     } else {
//       chatCounts[customerId] = 1;
//     }

//     // Store the latest chat for each customer
//     if (!latestChatsMap.has(customerId)) {
//       latestChatsMap.set(customerId, chat);
//     }
//   }

//   // Extract unique latest chats
//   const uniqueLatestChats = Array.from(latestChatsMap.values());

//   // Extract all enquiry IDs from unique latest chats
//   const enquiryIds = uniqueLatestChats.map((chat) => chat.enquiryId._id);

//   // Fetch all related enquiries including product details
//   const enquiries = await Enquiry.find({ _id: { $in: enquiryIds } }).populate({
//     path: "productId",
//     populate: {
//       path: "categoryId",
//       select: "categoryName",
//     },
//   });

//   // Map data for response
//   const data = uniqueLatestChats.map((chat) => {
//     const enquiry = enquiries.find((e) => e._id.equals(chat.enquiryId._id));
//     return {
//       _id: chat._id,
//       enquiryId: chat.enquiryId._id ? chat.enquiryId._id : "",
//       customerId: chat.customerId._id,
//       customerName: chat.customerId.name,
//       customerMobile: chat.customerId.mobile,
//       vendorId: chat.vendorId._id,
//       vendorName: chat.vendorId.name,
//       vendorImage: chat.vendorId.profileImage
//         ? `${process.env.APP_BASE_URL}/uploads/images/vendor/${chat.vendorId.profileImage}`
//         : "",
//       vendorMobile: chat.vendorId.mobile ? chat.vendorId.mobile : "",
//       productName: enquiry ? enquiry.productId.productName : "",
//       categoryName:
//         enquiry && enquiry.productId.categoryId
//           ? enquiry.productId.categoryId.categoryName
//           : "",
//       message: chat.message,
//       image: enquiry
//         ? `${process.env.APP_BASE_URL}/uploads/images/product/${enquiry.productId.productImage[0]}`
//         : null,
//       createdAt: moment(chat.createdAt)
//         .tz("Asia/Calcutta")
//         .format("YYYY-MM-DD HH:mm:ss"),
//       count: chatCounts[chat.customerId._id.toString()], // Add the count of chats for the customer
//     };
//   });

//   res.status(200).json({ data, success: true });
// });
// const getCustomerChats = asyncHandler(async (req, res) => {
//   const { customerId, search } = req.query;

//   // Fetch all chats for the customer, sorted by createdAt in descending order
//   let chats = await Chat.find({ customerId })
//     .populate({
//       path: "customerId",
//       select: "name mobile",
//     })
//     .populate({
//       path: "enquiryId",
//       populate: {
//         path: "productId",
//         populate: {
//           path: "categoryId",
//           select: "categoryName",
//         },
//       },
//     })
//     .populate({
//       path: "vendorId",
//       select: "name profileImage mobile",
//     })
//     .sort({ createdAt: -1 });

//   if (!chats || chats.length === 0) {
//     return res.status(404).json({ message: "No Chat Found!", success: false });
//   }

//   // Convert search to lower case for case-insensitive comparison
//   const searchLowerCase = search ? search.toLowerCase() : "";

//   // Filter chats based on search criteria
//   chats = chats.filter((chat) => {
//     const vendorName = chat.vendorId.name.toLowerCase();
//     const productName = chat.enquiryId.productId.productName.toLowerCase();

//     return (
//       vendorName.includes(searchLowerCase) ||
//       productName.includes(searchLowerCase)
//     );
//   });

//   // Handle case where no chats match the search criteria
//   if (chats.length === 0) {
//     return res.status(404).json({ message: "No Chat Found!", success: false });
//   }

//   // Create a map to hold the latest chat for each vendor and their chat counts
//   const latestChatsMap = new Map();
//   const chatCounts = {};

//   for (const chat of chats) {
//     const vendorId = chat.vendorId._id.toString();

//     // Count the number of chats per vendor
//     if (chatCounts[vendorId]) {
//       chatCounts[vendorId]++;
//     } else {
//       chatCounts[vendorId] = 1;
//     }

//     // Store the latest chat for each vendor
//     if (!latestChatsMap.has(vendorId)) {
//       latestChatsMap.set(vendorId, chat);
//     }
//   }

//   // Extract unique latest chats
//   const uniqueLatestChats = Array.from(latestChatsMap.values());

//   // Extract all enquiry IDs from unique latest chats
//   const enquiryIds = uniqueLatestChats.map((chat) => chat.enquiryId._id);

//   // Fetch all related enquiries including product details
//   const enquiries = await Enquiry.find({ _id: { $in: enquiryIds } }).populate({
//     path: "productId",
//     populate: {
//       path: "categoryId",
//       select: "categoryName",
//     },
//   });

//   // Map data for response
//   const data = uniqueLatestChats.map((chat) => {
//     const enquiry = enquiries.find((e) => e._id.equals(chat.enquiryId._id));
//     return {
//       _id: chat._id,
//       enquiryId: chat.enquiryId._id ? chat.enquiryId._id : "",
//       customerId: chat.customerId._id,
//       customerName: chat.customerId.name,
//       customerMobile: chat.customerId.mobile,
//       vendorId: chat.vendorId._id,
//       vendorName: chat.vendorId.name,
//       vendorImage: chat.vendorId.profileImage
//         ? `${process.env.APP_BASE_URL}/uploads/images/vendor/${chat.vendorId.profileImage}`
//         : "",
//       vendorMobile: chat.vendorId.mobile ? chat.vendorId.mobile : "",
//       productName: enquiry ? enquiry.productId.productName : "",
//       categoryName:
//         enquiry && enquiry.productId.categoryId
//           ? enquiry.productId.categoryId.categoryName
//           : "",
//       message: chat.message,
//       image: enquiry
//         ? `${process.env.APP_BASE_URL}/uploads/images/product/${enquiry.productId.productImage[0]}`
//         : null,
//       // createdAt: moment(chat.createdAt)
//       //   .tz("Asia/Calcutta")
//       //   .format("YYYY-MM-DD HH:mm:ss"),
//       createdAt: chat.createdAt,
//       count: chatCounts[chat.vendorId._id.toString()], // Add the count of chats for the vendor
//     };
//   });

//   res.status(200).json({ data, success: true });
// });

const handleOnline = async ({ vendorId, viewerType }) => {
  // console.log("Handling online status for vendor:", vendorId, "viewerType:", viewerType);
  if (viewerType == "vendor") {
    try {
      await Vendor.findByIdAndUpdate(vendorId, { lastOnline: new Date().toISOString() });
    } catch (e) {
      console.error(e);
    }
  }

};

const getCustomerChats = asyncHandler(async (req, res) => {
  const { customerId, search } = req.query;

  // 1️⃣ Fetch all chats for the customer
  let chats = await Chat.find({ customerId })
    .populate({
      path: "customerId",
      select: "name mobile",
    })
    .populate({
      path: "enquiryId",
      select: "quantity",
      populate: {
        path: "productId",
        select: "productName productImage isService",
        populate: {
          path: "categoryId",
          select: "categoryName",
        },
      },
    })
    .populate({
      path: "vendorId",
      select: "businessDetails profileImage mobile isPayment locationDetails lastOnline",
    })
    .sort({ createdAt: -1 });

  if (!chats || chats.length === 0) {
    return res.status(404).json({ message: "No Chat Found!", success: false });
  }

  // 2️⃣ Case-insensitive search (vendor name or product name)
  const searchLowerCase = search ? search.toLowerCase() : "";

  chats = chats.filter((chat) => {
    const vendorName = chat.vendorId?.name?.toLowerCase() || "";
    const productName = chat.enquiryId?.productId?.productName?.toLowerCase() || "";
    return (
      vendorName.includes(searchLowerCase) ||
      productName.includes(searchLowerCase)
    );
  });

  if (chats.length === 0) {
    return res.status(404).json({ message: "No Chat Found!", success: false });
  }

  // 3️⃣ Group chats by enquiryId and count chats per enquiry
  const groupedByEnquiry = {};
  for (const chat of chats) {
    const enquiryId = chat.enquiryId?._id?.toString();
    if (!enquiryId) continue;

    if (!groupedByEnquiry[enquiryId]) {
      groupedByEnquiry[enquiryId] = {
        count: 0,
        unreadCount: 0,
        latestChat: chat, // first (latest) chat because chats are sorted by createdAt desc
      };
    }
    groupedByEnquiry[enquiryId].count++;
    if (!chat.seenByCustomerAt) {
      groupedByEnquiry[enquiryId].unreadCount++;
    }
  }

  // 4️⃣ Map response data
  const data = Object.values(groupedByEnquiry)
    .filter((group) => group.count > 0) // only include those with chats
    .map((group) => {
      const chat = group.latestChat;
      const enquiry = chat.enquiryId;


      return {
        _id: chat._id,
        enquiryId: enquiry?._id || "",
        customerId: chat.customerId?._id || "",
        customerName: chat.customerId?.name || "",
        customerMobile: chat.customerId?.mobile || "",
        vendorId: chat.vendorId?._id || "",
        vendorName: chat.vendorId?.businessDetails?.businessName || "",
        city: chat.vendorId?.locationDetails?.city || "",
        isSubscribed: chat.vendorId?.isPayment || false,
        vendorImage: chat.vendorId?.profileImage
          ? `${process.env.APP_BASE_URL}/uploads/images/vendor/${chat.vendorId.profileImage}`
          : "",
        vendorMobile: chat.vendorId?.mobile || "",
        productName: enquiry?.productId?.productName || "",
        categoryName: enquiry?.productId?.categoryId?.categoryName || "",
        isService: enquiry?.productId?.isService || false,
        quantity: enquiry?.quantity || 0,
        message: chat.message || "",
        image: enquiry?.productId?.productImage?.[0]
          ? `${process.env.APP_BASE_URL}/uploads/images/product/${enquiry.productId.productImage[0]}`
          : null,
        createdAt: chat.createdAt
          ? chat.createdAt
          : "",
        count: group.count,
        unreadCount: group.unreadCount,
        lastOnline: chat.vendorId?.lastOnline || null,
      };
    });

  // 5️⃣ Handle case when all are filtered out
  if (data.length === 0) {
    return res.status(404).json({ message: "No Chat Found!", success: false });
  }

  // 6️⃣ Send response
  res.status(200).json({ data, success: true });
});


const getSingleChat = asyncHandler(async (req, res) => {
  const { customerId, vendorId, enquiryId } = req.body;

  if (customerId == "" || vendorId == "" || enquiryId == "") {
    return res
      .status(400)
      .json({ message: "Please provide all the fields!", success: false });
  }

  const chat = await Chat.find({
    customerId: customerId,
    vendorId: vendorId,
    enquiryId: enquiryId,
  }).sort({ createdAt: -1 });

  const data = chat.map((chat) => ({
    _id: chat._id,
    customerId: chat.customerId._id,
    customerName: chat.customerId.name,
    customerMobile: chat.customerId.mobile,
    enquiryId: chat.enquiryId,
    message: chat.message,
    userType: chat.userType,
    createdAt: chat.createdAt,
  }));

  res.status(200).json({ data: data, success: true });
});

module.exports = { getVendorChats, getCustomerChats, getSingleChat, handleOnline };
