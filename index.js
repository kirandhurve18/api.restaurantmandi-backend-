const express = require("express");
const http = require("http"); // Import http module
const socketIo = require("socket.io"); // Import socket.io
const connectDb = require("./db/connect");
require("dotenv").config();
require("colors");
const cors = require("cors");
const { errorHandler } = require("./middleware/errorMiddleware");
const PORT = process.env.PORT || 3006;
const app = express();
const path = require("path");
const Chat = require("./models/chatModel");
const Customer = require("./models/customerModel");
const Vendor = require("./models/vendorModel");
const Enquiry = require("./models/enquiryModel");
const Product = require("./models/productModel");
const mongoose = require("mongoose");
const { sendMessageFCM } = require("./controllers/notificationController");

connectDb();

// Using Middleware
const allowedOrigins = [
  "https://waayupro.in",
  "https://waayupro.in/marketplace",
  "https://restaurantmandi.com",
  "https://restaurantmandi.com/register",
  "https://marketplace.restaurantmandi.com",
  "https://marketplace.waayu.app",
  "http://localhost:4200",
  "http://192.168.1.45:4200",
  "http://localhost:3000",
  "https://apitest.payu.in",
  "https://api.payu.in",
  "https://test.payu.in",
  "https://secure.payu.in",
  "https://test.payu.in",
  "https://info.payu.in",
  "http://127.0.0.1:5500"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    optionsSuccessStatus: 204,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb", parameterLimit: 50000 }));

const uploadsFolder = path.join(__dirname, "uploads");
const imagesFolder = path.join(__dirname, "images");

// Routes
app.use("/api/vendor", require("./routes/vendorRoutes"));
app.use("/api/customer", require("./routes/customerRoutes"));
app.use("/api/category", require("./routes/categoryRoutes"));
app.use("/api/sub-category", require("./routes/subCategoryRoutes"));
app.use("/api/product", require("./routes/productRoutes"));
app.use("/api/home", require("./routes/homePageRoutes"));
app.use("/api/search", require("./routes/searchRoutes"));
app.use("/api/coupon", require("./routes/couponRoutes"));
app.use("/api/review", require("./routes/reviewRoutes"));
app.use("/api/offer", require("./routes/offerRoutes"));
app.use("/api/complaint", require("./routes/complaintRoutes"));
app.use("/api/enquiry", require("./routes/enquiryRoutes"));
app.use("/api/guest", require("./routes/guestRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));
app.use("/api/save_item", require("./routes/savedItemsRoutes"));
app.use("/api/notification", require("./routes/notificationRoutes"));
app.use("/api/policy", require("./routes/policyRoutes"));
app.use("/api/payu", require("./routes/payuRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/uploads", express.static(uploadsFolder));
app.use("/images", express.static(imagesFolder));

app.get("/", (_, res) => {
  res.status(200).json({ message: "Welcome to Restaurant Mandi" });
});

app.use(errorHandler);

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT"],
    credentials: true,
  },
});

// Socket.IO connection handler
io.on("connection", (socket) => {
  console.log("New client connected");

  // Join a room based on custId and vendorId
  socket.on("joinRoom", async ({ custId, vendorId, enquiryId, status, viewerType }) => {
    const room = `${custId}_${vendorId}_${enquiryId}`;
    socket.join(room);
    console.log(`Client joined room: ${room}`);

    let query;

    if (status == "all") {
      query = { vendorId: vendorId, customerId: custId };
    } else {
      query = {
        vendorId: vendorId,
        customerId: custId,
        enquiryId: enquiryId,
      };
    }

    await require("./controllers/chatController").handleOnline({ vendorId, viewerType });

    // If viewerType is provided, mark chats for this specific room as seen accordingly
    try {
      if (viewerType === "customer" && enquiryId) {
        await Chat.updateMany(
          {
            vendorId: vendorId,
            customerId: custId,
            enquiryId: enquiryId,
            seenByCustomerAt: { $in: [null, undefined] },
          },
          { $set: { seenByCustomerAt: new Date() } }
        );
      } else if (viewerType === "vendor" && enquiryId) {
        await Chat.updateMany(
          {
            vendorId: vendorId,
            customerId: custId,
            enquiryId: enquiryId,
            seenByVendorAt: { $in: [null, undefined] },
          },
          { $set: { seenByVendorAt: new Date() } }
        );

        


      }
    } catch (err) {
      console.error("Error updating seen timestamps on joinRoom:", err);
    }

    const chats = await Chat.find(query);

    // console.log(chats);

    const data = chats.map((elem) => {
      return {
        custId: elem.customerId,
        vendorId: elem.vendorId,
        enquiryId: elem.enquiryId,
        userType: elem.userType,
        message: elem.message,
        timestamp: elem.timestamp,
      };
    });

    io.to(room).emit("joinRoom", data);
  });

  // Handle messages from the client
  socket.on("message", async (data) => {
    console.log("Message received: ", data);

    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch (err) {
        console.error("Invalid JSON data received:", data);
        return;
      }
    }

    const { custId, enquiryId, vendorId, userType, message, timestamp } = data;
    const room = `${custId}_${vendorId}_${enquiryId}`;

    console.log("user type is: ", userType)
    try {
      const chat = await Chat.create({
        customerId: new mongoose.Types.ObjectId(custId),
        enquiryId: new mongoose.Types.ObjectId(enquiryId),
        vendorId: new mongoose.Types.ObjectId(vendorId),
        userType,
        message,
        timestamp,
      });
      console.log("Chat saved to MongoDB:", chat);
      console.log("User type is:", userType)
      // Emit the vendor message to the specific room
      io.to(room).emit("message", data);

      if (userType === "vendor") {
        // const customer = await Customer.findById(custId);
        const [customer, vendor] = await Promise.all([
          Customer.findById(custId),
          Vendor.findById(vendorId),
        ]);

        if (!customer || !vendor) {
          console.warn("❌ Customer or Vendor not found");
          return;
        }

        // Try to find related enquiry for product info
        const enquiry = await Enquiry.findById(enquiryId).lean();
        let product = null;

        if (enquiry?.productId) {
          product = await Product.findById(enquiry.productId).lean();
        }
        if (customer && customer.devices?.length) {
          const fcmTokens = customer.devices
            .map(d => d.fcmId)
            .filter(Boolean);

          if (fcmTokens.length) {

            const payload = {
              _id: chat._id?.toString(),
              enquiryId: enquiryId,
              customerId: custId,
              customerName: customer.name || "",
              customerMobile: customer.mobile || "",
              vendorId: vendorId,
              vendorName: vendor.name || vendor.businessDetails?.businessName || "",
              city:
                vendor.locationDetails?.city ||
                vendor.city ||
                enquiry?.city ||
                "",
              isSubscribed: vendor?.isPayment || false,
              vendorImage: vendor.profileImage
                ? vendor.profileImage.startsWith("http")
                  ? vendor.profileImage
                  : `${process.env.BASE_URL}${vendor.profileImage}`
                : "",
              vendorMobile: vendor.mobile || vendor.contactDetails?.mobileNumber || "",
              productName: product?.productName || enquiry?.productName || "",
              categoryName: enquiry?.categoryName || "",
              isService: product?.isService || false,
              quantity: enquiry?.quantity || "",
              image:
                product?.productImage?.length > 0
                  ? product.productImage[0]
                  : enquiry?.image || "",
              createdAt: chat.createdAt,
            };

            const jsonString = JSON.stringify(payload);

            const payloadData = {
              data: {
                type: "chat",
                title: "💬 New Message from Vendor",
                body: message,
                payload: jsonString,
                click_action: "FLUTTER_NOTIFICATION_CLICK",
              },
            };
            await sendMessageFCM(fcmTokens, payloadData);
          }
        }
      }
    } catch (error) {
      console.error("Error creating chat:", error);
      io.to(room).emit("error", error);
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Start the server
server.listen(PORT, () => {
  console.log("Server is Running on Port:", PORT.blue);
});
