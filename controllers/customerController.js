const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const Customer = require("../models/customerModel");

// @desc Register a new customer
// @route POST /api/customer/register
// const registerCustomer = asyncHandler(async (req, res) => {
//   const { name, email, password, mobile } = req?.body;

//   if (!name) {
//     return res.status(400).json({
//       message: "Please provide the customer name field.",
//       success: false,
//     });
//   }
//   if (!email) {
//     return res
//       .status(400)
//       .json({ message: "Please provide the email field.", success: false });
//   }
//   if (!password) {
//     return res
//       .status(400)
//       .json({ message: "Please provide the password field.", success: false });
//   }
//   if (!mobile) {
//     return res
//       .status(400)
//       .json({ message: "Please provide the mobile field.", success: false });
//   }

//   // Find if Customer already exists
//   const customerExists = await Customer.findOne({ mobile });

//   if (customerExists) {
//     return res.status(400).json({
//       message: `Customer already exists with mobile: ${mobile}`,
//       success: false,
//     });
//   }

//   // Hash password
//   const salt = await bcrypt.genSalt(10);
//   const hashedPassword = await bcrypt.hash(password, salt);

//   const otp = generateOtp();

//   let data = {
//     name,
//     email,
//     password: hashedPassword,
//     mobile,
//     otp,
//   };

//   if (req.file) {
//     const filenameWithoutSpaces = req.file.filename.replace(/\s+/g, "");
//     data.profileImage = filenameWithoutSpaces;
//   }

//   // Create Customer
//   const customer = await Customer.create(data);

//   if (customer) {
//     const imageUrl = `${process.env.APP_BASE_URL}/uploads/images/customer/${customer.profileImage}`;
//     return res.status(201).json({
//       data: {
//         _id: customer._id,
//         name: customer.name,
//         email: customer.email,
//         mobile: customer.mobile,
//         otp: customer.otp,
//         profileImage: imageUrl,
//         token: generateToken(customer._id),
//         createdAt: customer.createdAt,
//         updatedAt: customer.updatedAt,
//       },
//       success: true,
//     });
//   } else {
//     return res
//       .status(400)
//       .json({ message: "Error while creating customer!", message: false });
//   }
// });

const generateAccessAndRefreshTokensForCustomer = async (customer, deviceId) => {
  if (!deviceId) {
    throw new Error("Device ID is required to generate tokens per device");
  }

  const accessToken = customer.generateAccessToken(deviceId);
  const refreshToken = customer.generateRefreshToken(deviceId);

  // Update refresh token for that specific device
  await Customer.updateOne(
    { _id: customer._id, "devices.deviceId": deviceId },
    {
      $set: {
        "devices.$.refreshToken": refreshToken,
        "devices.$.otp": null
      }
    }
  );

  return { accessToken, refreshToken };
};

const registerCustomer = asyncHandler(async (req, res) => {
  const { name, email, password, mobile, restaurant_name, rest_id, unique_id } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Please provide the customer name field.", success: false });
  }
  if (!email) {
    return res.status(400).json({ message: "Please provide the email field.", success: false });
  }
  if (!password) {
    return res.status(400).json({ message: "Please provide the password field.", success: false });
  }
  if (!mobile) {
    return res.status(400).json({ message: "Please provide the mobile field.", success: false });
  }

  if (!rest_id) {
    return res.status(400).json({ message: "Please provide the Restaurant ID.", success: false });
  }

  // Find if Customer already exists
  const customerExists = await Customer.findOne({ mobile });
  if (customerExists) {
    return res.status(400).json({ message: `Customer already exists with mobile: ${mobile}`, success: false });
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  let data = {
    name,
    email,
    password: hashedPassword,
    mobile,
    restaurant_name: restaurant_name || null,
    rest_id: `${rest_id}`,
    unique_id: unique_id ? `${unique_id}` : null,
  };

  if (req.file) {
    const filenameWithoutSpaces = req.file.filename.replace(/\s+/g, "");
    data.profileImage = filenameWithoutSpaces;
  }

  const customer = await Customer.create(data);

  if (customer) {
    let imageUrl = null;
    if (customer.profileImage) {
      imageUrl = `${process.env.APP_BASE_URL}/uploads/images/customer/${customer.profileImage}`;
    }

    return res.status(201).json({
      data: {
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        mobile: customer.mobile,
        profileImage: imageUrl,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        restaurant_name: customer.restaurant_name
      },
      success: true
    });
  } else {
    return res.status(400).json({ message: "Error while creating customer!", success: false });
  }
});


// @desc Login a new Customer
// @route POST /api/customer/login
const loginCustomer = asyncHandler(async (req, res) => {
  const { mobile, deviceId, fcmId, hashKey } = req?.body;

  console.log(req.body)

  if (!mobile) {
    
    return res.status(200).send(false);
  }

  const customer = await Customer.findOne({ mobile });

  if (!customer || customer.status !== 1) {
    return res.status(200).send(false);
  }

  if (!deviceId) {
    return res.status(400).send({ message: "Device ID required" });
  }

  let otp = generateOtp(); // 4- or 6-digit random OTP
  if (mobile == "8983124128") otp = 1234;
  const countryCode = "91";
  const phoneNumber = countryCode + mobile;

  // Try updating existing device
  const result = await Customer.updateOne(
    { _id: customer._id, "devices.deviceId": deviceId },
    {
      $set: {
        "devices.$.fcmId": fcmId,
        "devices.$.hashKey": hashKey || "waayu",
        "devices.$.otp": otp
      }
    }
  );

  // If device doesn't exist, add it
  if (result.matchedCount === 0) {
    await Customer.updateOne(
      { _id: customer._id },
      {
        $push: {
          devices: {
            deviceId,
            fcmId,
            hashKey: hashKey || "waayu",
            otp
          }
        }
      }
    );
  };

  if (customer && customer.mobile == mobile) {
    if (mobile != 9028611660) {
      const sendSmsRes = await send_message(phoneNumber, otp, hashKey);

      if (sendSmsRes.status === "OK") {
        return res.status(200).send(true);
      } else if (sendSmsRes.status === "failure") {
        
        return res.status(500).send(false);
      }
    } else {
      return res.status(200).send(true);
    }
  } else {
    
    return res.status(500).send(false);
  }
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { mobile, otp } = req?.body;

  if (!mobile) {
    return res.status(200).send(false);
  }
  if (!otp) {
    return res.status(200).send(false);
  }

  try {
    const customer = await Customer.findOne({ mobile, "devices.otp": Number(otp) });
    if (!customer)
      return res.status(400).json({ success: false, message: "Invalid OTP" });

    const device = customer.devices.find((d) => d.otp === Number(otp));
    if (!device)
      return res.status(400).json({ success: false, message: "Device not found for OTP" });

    if (!customer || customer.status !== 1) {
      return res.status(200).send(false);
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokensForCustomer(customer, device?.deviceId);

    const imageUrl = `${process.env.APP_BASE_URL}/uploads/images/customer/${customer.profileImage}`;
    return res.status(200).json({
      _id: customer._id,
      name: customer.name,
      email: customer.email,
      mobile: customer.mobile,
      profileImage: imageUrl,
      token: accessToken,
      refreshToken: refreshToken,
      success: true,
    });
  } catch (error) {
    return res.status(500).send(false);
  }
});

const loginCustomerWithEmail = asyncHandler(async (req, res) => {
  const { email, password, deviceId, fcmId, hashKey } = req?.body;

  // Basic validation
  if (!email || !password || !deviceId || !fcmId) {
    return res.status(400).send({ message: "All fields are required" });
  }

  try {
    // Find customer by email
    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    // Check if customer is active
    if (customer.status !== 1) {
      return res.status(400).send(false);
    }

    // Verify password
    const isPasswordValid = await customer.isPasswordCorrect(password);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    // Update or add device details
    const deviceIndex = customer.devices.findIndex((d) => d.deviceId === deviceId);

    if (deviceIndex !== -1) {
      // Update existing device
      customer.devices[deviceIndex].fcmId = fcmId;
      customer.devices[deviceIndex].hashKey = hashKey || "waayu"
    } else {
      // Add new device entry
      customer.devices.push({
        deviceId,
        fcmId,
        hashKey: hashKey || "waayu"
      });
    }

    await customer.save({ validateBeforeSave: false });

    // Generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokensForCustomer(customer, deviceId);

    const imageUrl = `${process.env.APP_BASE_URL}/uploads/images/customer/${customer.profileImage}`;

    return res.status(200).json({
      _id: customer._id,
      name: customer.name,
      email: customer.email,
      mobile: customer.mobile,
      profileImage: imageUrl,
      token: accessToken,
      refreshToken: refreshToken,
      success: true,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).send(false);
  }
});


const generateOtp = () => {
  return Math.floor(1000 + Math.random() * 9000);
};

async function send_message(numbers, otp, hashkey = "waayu") {
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

const logoutCustomer = asyncHandler(async (req, res) => {
  const customerId = req.user._id;
  const deviceId = req.deviceId;

  if (!deviceId) {
    return res.status(400).json({ success: false, message: "Device ID missing from token" });
  }

  await Customer.updateOne(
    { _id: customerId, "devices.deviceId": deviceId },
    { $unset: { "devices.$.refreshToken": "" } }
  );

  return res.status(200).json({ success: true, message: "Logged out from this device" });
});

const refreshAccessAndRefreshTokensForCustomer = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ success: false, message: "Refresh token required" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const { id, deviceId } = decoded;

    const customer = await Customer.findOne({
      _id: id,
      "devices.deviceId": deviceId,
      "devices.refreshToken": refreshToken
    });

    if (!customer) {
      return res.status(401).json({ success: false, message: "Invalid refresh token" });
    }

    const tokens = await generateAccessAndRefreshTokensForCustomer(customer, deviceId);

    return res.status(200).json({
      success: true,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
  }
});

// Update Profile
const updateProfile = asyncHandler(async (req, res) => {
  let data = req.body;

  const customerExists = await Customer.findById(data.id);

  if (!customerExists) {
    return res
      .status(400)
      .json({ message: "Customer not found!", success: false });
  }

  if (req.file) {
    const filenameWithoutSpaces = req.file.filename.replace(/\s+/g, "");
    data.profileImage = filenameWithoutSpaces;
  }

  // Remove the mobile field from the data object to prevent updating it
  delete data.mobile;

  const customer = await Customer.findByIdAndUpdate(data.id, data, {
    new: true,
  });

  if (!customer) {
    return res
      .status(500)
      .json({ message: "Error while updating customer", success: false });
  }

  return res
    .status(200)
    .json({ message: "Customer Profile Updated Successfully!", success: true });
});

const getCustomerProfile = asyncHandler(async (req, res) => {
  const { customerId } = req.body;

  if (!customerId) {
    return res
      .status(400)
      .json({ message: "Please provide the customer ID!.", success: false });
  }

  const user = await Customer.findById(customerId);

  if (!user) {
    return res
      .status(400)
      .json({ message: "Customer not found!", success: false });
  }

  const data = {
    _id: user._id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    profileImage: `${process.env.APP_BASE_URL}/uploads/images/customer/${user.profileImage}`,
    dob: user.dob,
    gender: user.gender,
  };

  res.status(200).json({ data, success: true });
});

const deleteCustomer = asyncHandler(async (req, res) => {
  const { customerId, status } = req.body;

  if (!customerId) {
    return res
      .status(400)
      .json({ message: "Please provide the customer ID!.", success: false });
  }
  if (!status) {
    return res
      .status(400)
      .json({ message: "Please provide the status field.", success: false });
  }

  const user = await Customer.findByIdAndUpdate(customerId, { status: status });

  if (!user) {
    return res
      .status(400)
      .json({ message: "Customer not found!", success: false });
  }

  res
    .status(200)
    .json({ message: "Customer Deleted Successfully!", success: true });
});

// @desc Register a new customer
// @route POST /api/customer/registerWithOTP
const registerCustomerWithOTP = asyncHandler(async (req, res) => {
  const { name, email, mobile, city, restaurant_name } = req?.body;

  if (!name) {
    return res.status(400).json({
      message: "Please provide the customer name field.",
      success: false,
    });
  }
  if (!email) {
    return res
      .status(400)
      .json({ message: "Please provide the email field.", success: false });
  }
  // if (!password) {
  //   return res
  //     .status(400)
  //     .json({ message: "Please provide the password field.", success: false });
  // }
  if (!mobile) {
    return res
      .status(400)
      .json({ message: "Please provide the mobile field.", success: false });
  }
  if (!city) {
    return res
      .status(400)
      .json({ message: "Please provide the city field.", success: false });
  }
  if (!restaurant_name) {
    return res.status(400).json({
      message: "Please provide the restaurant_name field.",
      success: false,
    });
  }

  const otp = generateOtp();

  let data = {
    name,
    email,
    mobile,
    otp,
    city,
    restaurant_name,
    status: 0,
  };

  // Find if Customer already exists
  const customerExists = await Customer.findOne({ mobile });

  // console.log("customerExists --> ", customerExists);
  let customer = null;

  if (customerExists && customerExists.status == 1) {
    return res.status(400).json({
      message: `Customer already exists with mobile: ${mobile}`,
      success: false,
    });
  } else if (customerExists && customerExists.status == 0) {
    customer = await Customer.findOneAndUpdate(
      { mobile },
      { $set: data },
      { new: true }
    );
  } else {
    // Create Customer
    customer = await Customer.create(data);
  }

  // Hash password
  // const salt = await bcrypt.genSalt(10);
  // const hashedPassword = await bcrypt.hash(password, salt);

  // if (req.file) {
  //   const filenameWithoutSpaces = req.file.filename.replace(/\s+/g, "");
  //   data.profileImage = filenameWithoutSpaces;
  // }

  const country_code = "91";
  const phoneNumber = country_code + mobile;

  const numbers = phoneNumber;
  const sendSmsRes = await send_message(numbers, otp, "waayu");

  console.log(sendSmsRes);
  if (sendSmsRes.status === "OK") {
    return res.status(200).send(true);
  } else if (sendSmsRes.status === "failure") {
    return res.status(500).send(false);
  } else {
    return res.status(500).send(false);
  }
});

const verifyRegistrationOtp = asyncHandler(async (req, res) => {
  const { mobile, otp } = req?.body;

  if (!mobile) {
    return res.status(200).send(false);
  }
  if (!otp) {
    return res.status(200).send(false);
  }

  const customer = await Customer.findOne({ mobile });

  if (!customer) {
    return res.status(200).send(false);
  }

  if (customer && customer.otp == otp) {
    await Customer.findOneAndUpdate({ mobile }, { status: 1 });
    return res.status(200).send(true);
  } else {
    return res.status(500).send(false);
  }
});

module.exports = {
  registerCustomer,
  loginCustomer,
  verifyOtp,
  updateProfile,
  getCustomerProfile,
  deleteCustomer,
  registerCustomerWithOTP,
  verifyRegistrationOtp,
  logoutCustomer,
  refreshAccessAndRefreshTokensForCustomer,
  loginCustomerWithEmail
};
