const asyncHandler = require("express-async-handler");
const Admin = require("../models/adminModel")
const Vendor = require("../models/vendorModel");
const { refreshToken } = require("firebase-admin/app");
const jwt = require("jsonwebtoken");
const moment = require("moment-timezone");
const ExcelJS = require("exceljs");
const Category = require("../models/categoryModel");
const Sub_Category = require("../models/subCategoryModel");
const path = require('path');
const Employee = require("../models/employeeModel");
const payuResponse = require("../models/payuResponseModel");
const { default: mongoose } = require("mongoose");
const bcrypt = require("bcryptjs");

const registerAdmin = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username && !password) {
    return res.status(400).json({
      success: false,
      message: "Username and password are required",
    });
  }

  const existingAdmin = await Admin.findOne({ username });
  if (existingAdmin) {
    return res.status(409).json({
      success: false,
      message: "Admin user already registered. Try logging in.",
    });
  }

  const newAdmin = await Admin.create({
    username,
    password,
  });

  return res.status(201).json({
    success: true,
    message: "Admin user registered successfully",
    data: {
      id: newAdmin._id,
      username: newAdmin.username,
      createdAt: newAdmin.createdAt,
    },
  });
});

const loginAdmin = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username && !password) {
    return res.status(400).json({
      success: false,
      message: "Username and password are required",
    });
  }

  const admin = await Admin.findOne({ username });
  if (!admin) {
    return res.status(401).json({
      success: false,
      message: "Invalid username or password",
    });
  }

  const isPasswordValid = await admin.isPasswordCorrect(password);
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: "Invalid username or password",
    });
  }

  const accessToken = admin.generateAccessToken();
  const refreshToken = admin.generateRefreshToken();

  admin.refreshToken = refreshToken;
  await admin.save({ validateBeforeSave: false });

  return res.status(200).json({
    success: true,
    message: "Login successful",
    accessToken,
    refreshToken,
    data: {
      id: admin._id,
      username: admin.username,
      createdAt: admin.createdAt,
    },
  });
});

const logoutAdmin = asyncHandler(async (req, res) => {
  const adminId = req.user._id;

  const admin = await Admin.findByIdAndUpdate(
    adminId,
    { $unset: { refreshToken: "" } },
    { new: true }
  );

  if (!admin) {
    return res.status(404).json({ success: false, message: "Admin not found" });
  }

  return res.status(200).json({
    success: true,
    message: "Logged out from this device",
  });
});

const refreshAccessAndRefreshTokensForAdmin = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: "Refresh token required",
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const { id } = decoded;

    const admin = await Admin.findOne({
      _id: id,
      refreshToken: refreshToken,
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const newAccessToken = admin.generateAccessToken();
    const newRefreshToken = admin.generateRefreshToken();

    admin.refreshToken = newRefreshToken;
    await admin.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error("Admin refresh token error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
});

const addVendor = asyncHandler(async (req, res) => {
  try {
    const {
      name, email, mobile, business_website, business_number, alternate_business_number, contact_email, category_id,
      business_name, legal_business_name, building_name, street_name,
      landmark, area, stdcode, latitude, longitude, pincode, city, state,
      country, business_open_time, business_close_time, contact_name, hasGstin, isGstVerified, gstNumber,
      owner_name, working_days
    } = req.body;

    // 1. Define all the fields that are mandatory.
    const requiredFields = [
      'mobile', 'email', 'business_name', 'pincode', 'city', 'state', 'category_id',
    ];

    // 2. Find all the missing fields.
    const missingFields = [];
    for (const field of requiredFields) {
      // Check if the field is missing or just an empty string
      if (!req.body[field]) {
        if (req.body[field] !== false) missingFields.push(field); // Allow hasGstin: false
      }
    }

    // 3. If any fields are missing, send ONE single error response.
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `The following fields are required: ${missingFields.join(', ')}`
      });
    }

    // You can also add more specific validation after the required check
    if (!email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address."
      });
    }

    if (!Array.isArray(category_id)) {
      return res.status(400).json({
        success: false,
        message: "Category Ids should be an array."
      });
    }

    const category_obj_id = category_id.map(category => {
      return new Object(category);
    })

    const category_details = await Category.find({ _id: { $in: category_id } });

    const plainPassword = "1234"; // Default password

    const saltRounds = 10; // number of salt rounds
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

    const vendor_details = {
      name: name,
      email: email,
      password: hashedPassword,
      mobile: mobile,
      alternateMobile: alternate_business_number,
      address: `${building_name.trim() || ""} ${street_name.trim() || ""} ${landmark || ""} ${area || ""}`,
      city: city,
      state: state,
      pincode: pincode,
      businessWebsite: {
        website: business_website,
        number: business_number
      },
      categories: category_details.map(category => {
        return {
          categoryId: category._id,
          categoryName: category.categoryName
        }
      }),
      businessDetails: {
        businessName: business_name,
        legalBusinessName: legal_business_name
      },
      contactDetails: {
        contactName: contact_name,
        owner: owner_name,
        whatsapp: mobile,
        mobileNumber: mobile,
        emailAddress: contact_email || email,
      },
      locationDetails: {
        buildingName: building_name,
        streetName: street_name,
        landmark: landmark,
        area: area,
        stdcode: stdcode,
        gps: {
          coordinates: [parseFloat(longitude), parseFloat(latitude)]
        },
        pincode: pincode,
        city: city,
        state: state,
        country: country
      },
      businessTimings: {
        regular: {
          days: working_days,
          regularTime: [{
            openAt: business_open_time,
            closeAt: business_close_time
          }
          ]

        }
      },
      kyc: {},
    };

    // Handle GST/KYC details
    vendor_details.kyc.hasGstin = hasGstin === true || hasGstin === 'true';
    vendor_details.kyc.isGstVerified = isGstVerified === true || isGstVerified === 'true';

    if (vendor_details.kyc.hasGstin) {
      // Real GST provided
      vendor_details.kyc.gstNumber = gstNumber || null;
      vendor_details.kyc.temporaryGstNumber = null;
    } else {
      // No GST → treat gstNumber as temporary
      vendor_details.kyc.temporaryGstNumber = gstNumber || null;
      vendor_details.kyc.gstNumber = null;
      vendor_details.kyc.isGstVerified = false; // Cannot be verified if it's not a real GSTIN
    }

    const new_vendor = new Vendor(vendor_details);
    await new_vendor.save({ validateBeforeSave: false });


    return res.status(200).json({
      success: true,
      message: "Vendor Created Successfully"
    })
  } catch (error) {
    console.error("Error adding vendor:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
})

const updateVendor = asyncHandler(async (req, res) => {
  // 1. Find the vendor by ID from the route parameters
  const vendor = await Vendor.findById(req.params.id);

  // 2. Handle the case where the vendor is not found
  if (!vendor) {
    return res.status(404).json({
      success: false,
      message: "Vendor not found with the provided ID."
    });
  }

  const {
    name, email, mobile, business_website, business_number, category_id,
    business_name, legal_business_name, building_name, street_name,
    landmark, area, stdcode, latitude, longitude, pincode, city, state, hasGstin, isGstVerified, gstNumber,
    country, business_open_time, business_close_time, contact_name, contact_email,
    owner_name, working_days, alternate_business_number, supplier_status,
  } = req.body;

  // --- Basic fields ---
  if (name) vendor.name = name;
  if (email) {
    if (!email.includes('@')) {
      return res.status(400).json({ success: false, message: "Please provide a valid email address." });
    }
    vendor.email = email;
  }
  if (mobile) {
    vendor.mobile = mobile;
    vendor.contactDetails.mobileNumber = mobile;
    vendor.contactDetails.whatsapp = mobile;
  }

  // --- Business details ---
  if (business_name) vendor.businessDetails.businessName = business_name;
  if (legal_business_name) vendor.businessDetails.legalBusinessName = legal_business_name;

  // --- Contact details ---
  if (contact_name) vendor.contactDetails.contactName = contact_name;
  if (owner_name) vendor.contactDetails.owner = owner_name;
  if (contact_email) vendor.contactDetails.emailAddress = contact_email;

  // --- Business website ---
  if (business_website) vendor.businessWebsite.website = business_website;
  if (business_number) vendor.businessWebsite.number = business_number;

  // --- Location details ---
  if (building_name) vendor.locationDetails.buildingName = building_name;
  if (street_name) vendor.locationDetails.streetName = street_name;
  if (landmark) vendor.locationDetails.landmark = landmark;
  if (area) vendor.locationDetails.area = area;
  if (stdcode) vendor.locationDetails.stdcode = stdcode;
  if (pincode) vendor.pincode = pincode;
  if (city) vendor.city = city;
  if (state) vendor.state = state;
  if (country) vendor.locationDetails.country = country;
  if (alternate_business_number) {
    vendor.alternateMobile = alternate_business_number;
  }


  // Reconstruct address if any part of it changed
  vendor.address = `${vendor.locationDetails.buildingName || ""} ${vendor.locationDetails.streetName || ""} ${vendor.locationDetails.landmark || ""} ${vendor.locationDetails.area || ""}`.trim();

  // --- GPS Coordinates ---
  if (latitude && longitude) {
    vendor.locationDetails.gps = {
      type: "Point",
      coordinates: [parseFloat(longitude), parseFloat(latitude)]
    };
  }

  // --- Business timings ---
  if (working_days || business_open_time || business_close_time) {
    const days = working_days || vendor.businessTimings.regular.days || [];
    const openTime = business_open_time || vendor.businessTimings.regular.regularTime?.[0]?.openAt || "09:00 AM";
    const closeTime = business_close_time || vendor.businessTimings.regular.regularTime?.[0]?.closeAt || "06:00 PM";

    vendor.businessTimings.regular.days = days;
    vendor.businessTimings.regular.regularTime = [{
      openAt: openTime,
      closeAt: closeTime,
    }];
  }

  // --- Category update ---
  if (category_id) {
    const categoryIds = Array.isArray(category_id) ? category_id : [category_id];
    const categoryDetails = await Category.find({ _id: { $in: categoryIds } });

    vendor.categories = categoryDetails.map(cat => ({
      categoryId: cat._id,
      categoryName: cat.categoryName,
    }));
  }

  // --- GST/KYC update ---
  if (hasGstin !== undefined) {
    vendor.kyc.hasGstin = hasGstin === true || hasGstin === 'true';
    vendor.kyc.isGstVerified = isGstVerified === true || isGstVerified === 'true';

    if (vendor.kyc.hasGstin) {
      vendor.kyc.gstNumber = gstNumber || null;
      vendor.kyc.temporaryGstNumber = null;
    } else {
      // If hasGstin is false, the provided number is temporary
      vendor.kyc.temporaryGstNumber = gstNumber || null;
      vendor.kyc.gstNumber = null;
      vendor.kyc.isGstVerified = false; // Reset verification status
    }
  }

  if (supplier_status && !vendor.isPayment) {
    // if(supplier_status == "Paid"){
    //   vendor.isPayment = true;
    //   vendor.isArchived = false;
    // }else 
    if (supplier_status == "Registered") {
      vendor.isPayment = false;
      vendor.isArchived = false;
    } else if (supplier_status == "Archived") {
      vendor.isArchived = true;
    }
  }

  await vendor.save();

  return res.status(200).json({
    success: true,
    message: "Vendor Updated Successfully",
    data: vendor,
  });
});

const getVendorDetails = asyncHandler(async (req, res) => {
  // 1. Find the vendor by ID from the route parameters
  const vendor = await Vendor.findById(req.params.id)
    .populate({
      path: "categories.categoryId", // populate the categoryId field inside categories array
      select: "categoryName _id",            // only get name and _id from Category model
    });
  // 2. Handle the case where the vendor is not found
  if (!vendor) {
    return res.status(404).json({
      success: false,
      message: "Vendor not found with the provided ID."
    });
  }

  const business_categories = await Category.find({ vendorId: { $in: [null, undefined] } }).select("_id categoryName");

  // 3. Reformat the vendor document into the flat structure expected by the frontend/API consumer
  const vendorDetailsResponse = {
    id: vendor._id.toString(),
    name: vendor.name,
    email: vendor.email,
    mobile: vendor.mobile,
    business_website: vendor.businessWebsite?.website,
    business_number: vendor.businessWebsite?.number,
    vendor_categories: vendor.categories
      ?.filter(cat => cat.categoryId) // ensure populated data exists
      ?.map(cat => ({
        _id: cat.categoryId._id?.toString(),
        categoryName: cat.categoryId.categoryName,
      })) || [],
    business_categories: business_categories,
    business_name: vendor.businessDetails?.businessName,
    legal_business_name: vendor.businessDetails?.legalBusinessName,
    building_name: vendor.locationDetails?.buildingName,
    street_name: vendor.locationDetails?.streetName,
    landmark: vendor.locationDetails?.landmark,
    area: vendor.locationDetails?.area,
    stdcode: vendor.locationDetails?.stdcode,
    latitude: vendor.locationDetails?.gps?.coordinates[1], // Latitude is the second element
    longitude: vendor.locationDetails?.gps?.coordinates[0], // Longitude is the first element
    pincode: vendor.pincode,
    city: vendor.city,
    kyc: vendor?.payuResponse ? vendor?.payuResponse : {},
    gstNumber: vendor?.kyc?.gstNumber ? vendor?.kyc?.gstNumber : null,
    isGstVerified: vendor?.kyc?.isGstVerified || false,
    state: vendor.state,
    country: vendor.locationDetails?.country,
    business_open_time: vendor.businessTimings?.regular?.regularTime[0]?.openAt,
    business_close_time: vendor.businessTimings?.regular?.regularTime[0]?.closeAt,
    contact_name: vendor.contactDetails?.contactName,
    contact_email: vendor.contactDetails?.emailAddress,
    owner_name: vendor.contactDetails?.owner,
    working_days: vendor.businessTimings?.regular?.days,
  };

  const supplierStatus = vendor.isArchived ? "Archived" : (vendor.isPayment ? "Paid" : "Registered");

  vendorDetailsResponse.alternate_business_number = vendor.alternateMobile || "";
  vendorDetailsResponse.supplier_status = supplierStatus;


  const subscriptionDetails = await payuResponse.find({ "response.udf1": vendor._id.toString(), "response.status": "success" }).sort({ createdAt: -1 });

  const subscriptionInfo = subscriptionDetails.map(sub => ({
    payu_response_id: sub._id,
    subscription_amount: sub.response.amount,
    payment_mode: sub.response.mode,
    transaction_id: sub.response.txnid,
    subscription_start_data: sub.createdAt,
    subscription_end_date: moment(sub.createdAt).add(12, 'months').toDate(),
  }));

  vendorDetailsResponse.subscriptionInfo = subscriptionInfo;


  return res.status(200).json({
    success: true,
    message: "Vendor details fetched successfully",
    data: vendorDetailsResponse
  });
});

const deleteVendor = asyncHandler(async (req, res) => {
  const vendorId = req.params.id;

  const vendor = await Vendor.findByIdAndDelete(vendorId);

  if (!vendor) {
    return res.status(404).json({
      success: false,
      message: "Vendor not found with the provided ID."
    });
  }

  return res.status(200).json({
    success: true,
    message: "Vendor deleted successfully."
  });
});

const createCategory = asyncHandler(async (req, res) => {
  const { categoryName, active } = req.body;

  if (!categoryName) {
    res.status(400);
    throw new Error("Category name is required.");
  }

  const categoryExists = await Category.findOne({ categoryName });
  if (categoryExists) {
    res.status(400);
    throw new Error("A category with this name already exists.");
  }

  let catImage = null;

  if (req.file) {
    catImage = req.file.filename;
  }

  const newCategory = new Category({
    categoryName,
    categoryImage: catImage,
    active: active == "true" || active === true
  });

  const createdCategory = await newCategory.save();

  res.status(201).json({
    success: true,
    message: "Category created successfully.",
    data: createdCategory,
  });
});

const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error("Category not found.");
  }

  const basePath = `${process.env.APP_BASE_URL}/uploads/images/category/`;

  // ✅ Prepend base URL if needed
  if (
    category.categoryImage &&
    typeof category.categoryImage === "string" &&
    !category.categoryImage.startsWith("http")
  ) {
    category.categoryImage = `${basePath}${category.categoryImage}`;
  }

  res.status(200).json({
    success: true,
    data: category,
  });
});

const getAllCategory = asyncHandler(async (req, res) => {
  // Get pagination and search query from request
  const { search, download } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build the initial match filter for the aggregation pipeline and count
  const matchFilter = {};
  if (search) {
    // Use regex for a case-insensitive search on the categoryName
    matchFilter.categoryName = { $regex: search, $options: 'i' };
  }

  const aggregateFunction = [
    // First stage: filter by the search query
    { $match: matchFilter },
    {
      $lookup: {
        from: "sub_categories", // The collection name for the Sub_Category model
        localField: "_id",
        foreignField: "categoryId",
        as: "subCategories"
      }
    },
    {
      $addFields: {
        subCategoryCount: { $size: "$subCategories" }
      }
    },
    {
      $project: {
        subCategories: 0 // Exclude the full subCategories array from the final result
      }
    }
  ];

  if (download != "true") {
    aggregateFunction.push({ $skip: skip });
    aggregateFunction.push({ $limit: limit });
  }

  // Aggregation pipeline to search, join with sub-categories, and get the count
  const categories = await Category.aggregate(aggregateFunction);


  const totalCategories = await Category.countDocuments(matchFilter);
  const basePath = `${process.env.APP_BASE_URL}/uploads/images/category/`;

  // ✅ Prepend base URL to category images
  const modifiedCategories = categories.map((category) => {
    if (
      category.categoryImage &&
      typeof category.categoryImage === "string" &&
      !category.categoryImage.startsWith("http")
    ) {
      category.categoryImage = `${basePath}${category.categoryImage}`;
    }
    return category;
  });

  if (download === "true") {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Categories");

    worksheet.columns = [
      { header: "Category ID", key: "_id", width: 25 },
      { header: "Category Name", key: "categoryName", width: 30 },
      { header: "Image URL", key: "categoryImage", width: 50 },
      { header: "Status", key: "active", width: 25 },
      { header: "Sub-Category Count", key: "subCategoryCount", width: 25 },
      { header: "Created At", key: "createdAt", width: 20 },
    ];

    modifiedCategories.forEach((c) => {
      worksheet.addRow({
        _id: c._id.toString(),
        categoryName: c.categoryName || "-",
        categoryImage: c.categoryImage || "-",
        active: c.active === true ? "Published" : c.active === false ? "Unpublished" : "-",
        subCategoryCount: c.subCategoryCount || 0,
        createdAt: c.createdAt
          ? new Date(c.createdAt).toLocaleDateString("en-IN")
          : "-",
      });
    });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Categories_List.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    return res.end();
  }

  res.status(200).json({
    success: true,
    count: modifiedCategories.length,
    total: totalCategories,
    page: page,
    pages: Math.ceil(totalCategories / limit),
    data: modifiedCategories,
  });
});

const fetchAllCategories = asyncHandler(async (req, res) => {
  // Get pagination and search query from request
  const { search } = req.query;

  // Build the initial match filter for the aggregation pipeline and count
  const matchFilter = {};
  if (search) {
    // Use regex for a case-insensitive search on the categoryName
    matchFilter.categoryName = { $regex: search, $options: 'i' };
  }

  // Aggregation pipeline to search, join with sub-categories, and get the count
  const categories = await Category.aggregate([
    // First stage: filter by the search query
    { $match: matchFilter },
    {
      $lookup: {
        from: "sub_categories", // The collection name for the Sub_Category model
        localField: "_id",
        foreignField: "categoryId",
        as: "subCategories"
      }
    },
    {
      $addFields: {
        subCategoryCount: { $size: "$subCategories" }
      }
    },
    {
      $project: {
        subCategories: 0 // Exclude the full subCategories array from the final result
      }
    }
  ]);

  const basePath = `${process.env.APP_BASE_URL}/uploads/images/category/`;

  // ✅ Prepend base URL to category images
  const modifiedCategories = categories.map((category) => {
    if (
      category.categoryImage &&
      typeof category.categoryImage === "string" &&
      !category.categoryImage.startsWith("http")
    ) {
      category.categoryImage = `${basePath}${category.categoryImage}`;
    }
    return category;
  });

  res.status(200).json({
    success: true,
    count: modifiedCategories.length,
    data: modifiedCategories
  });
});

const updateCategory = asyncHandler(async (req, res) => {
  const { categoryName, active } = req.body;

  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error("Category not found.");
  }

  if (categoryName) {
    category.categoryName = categoryName;
  }

  if (active != undefined) {
    category.active = active === 'true' || active === true;
  }

  if (req.file) {
    category.categoryImage = req.file.filename;
  }

  const updatedCategory = await category.save();

  res.status(200).json({
    success: true,
    message: "Category updated successfully.",
    data: updatedCategory,
  });
});


const deleteCategory = asyncHandler(async (req, res) => {
  const categoryId = req.params.id;

  const category = await Category.findByIdAndDelete(categoryId);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Category not found with the provided ID."
    });
  }

  return res.status(200).json({
    success: true,
    message: "Category deleted successfully."
  });
});

const createSubCategory = asyncHandler(async (req, res) => {
  const { subCategoryName, categoryId, active } = req.body;

  if (!subCategoryName) {
    res.status(400);
    throw new Error("Sub-category name is required.");
  }
  if (!categoryId) {
    res.status(400);
    throw new Error("A parent category ID is required.");
  }

  const parentCategory = await Category.findById(categoryId);
  if (!parentCategory) {
    res.status(404);
    throw new Error("Parent category not found.");
  }

  const subCategoryExists = await Sub_Category.findOne({ subCategoryName, categoryId }); // Changed from parentCategoryId
  if (subCategoryExists) {
    res.status(400);
    throw new Error("A sub-category with this name already exists under the selected parent category.");
  }

  let catImage = null;

  if (req.file) {
    catImage = req.file.filename;
  }


  const newSubCategory = new Sub_Category({
    subCategoryName,
    categoryId,
    subCategoryImage: catImage,
    active: active == "true" || active === true
  });

  const createdSubCategory = await newSubCategory.save();

  res.status(201).json({
    success: true,
    message: "Sub-category created successfully.",
    data: createdSubCategory,
  });
});

const getSubCategory = asyncHandler(async (req, res) => {
  const subCategory = await Sub_Category.findById(req.params.id).populate("categoryId");

  if (!subCategory) {
    res.status(404);
    throw new Error("Sub-category not found.");
  }

  const subBasePath = `${process.env.APP_BASE_URL}/uploads/images/subCategory/`;
  const catBasePath = `${process.env.APP_BASE_URL}/uploads/images/category/`;

  // ✅ Prepend base URL for sub-category image
  if (
    subCategory.subCategoryImage &&
    typeof subCategory.subCategoryImage === "string" &&
    !subCategory.subCategoryImage.startsWith("http")
  ) {
    subCategory.subCategoryImage = `${subBasePath}${subCategory.subCategoryImage}`;
  }

  // ✅ Prepend base URL for parent category image (if populated)
  if (
    subCategory.categoryId?.categoryImage &&
    typeof subCategory.categoryId.categoryImage === "string" &&
    !subCategory.categoryId.categoryImage.startsWith("http")
  ) {
    subCategory.categoryId.categoryImage = `${catBasePath}${subCategory.categoryId.categoryImage}`;
  }

  res.status(200).json({
    success: true,
    data: subCategory,
  });
});


const getAllSubCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  if (!categoryId) {
    res.status(400);
    throw new Error("Parent category ID is required in the URL.");
  }

  const filter = { categoryId };

  const subCategories = await Sub_Category.find(filter)
    .populate("categoryId")
    .skip(skip)
    .limit(limit);

  const totalSubCategories = await Sub_Category.countDocuments(filter);

  const subBasePath = `${process.env.APP_BASE_URL}/uploads/images/subCategory/`;
  const catBasePath = `${process.env.APP_BASE_URL}/uploads/images/category/`;

  // ✅ Prepend base URL to sub-category and parent category images
  const modifiedSubCategories = subCategories.map((subCat) => {
    // Sub-category image
    if (
      subCat.subCategoryImage &&
      typeof subCat.subCategoryImage === "string" &&
      !subCat.subCategoryImage.startsWith("http")
    ) {
      subCat.subCategoryImage = `${subBasePath}${subCat.subCategoryImage}`;
    }

    // Parent category image (if populated)
    if (
      subCat.categoryId?.categoryImage &&
      typeof subCat.categoryId.categoryImage === "string" &&
      !subCat.categoryId.categoryImage.startsWith("http")
    ) {
      subCat.categoryId.categoryImage = `${catBasePath}${subCat.categoryId.categoryImage}`;
    }

    return subCat;
  });

  res.status(200).json({
    success: true,
    count: modifiedSubCategories.length,
    total: totalSubCategories,
    page,
    pages: Math.ceil(totalSubCategories / limit),
    data: modifiedSubCategories,
  });
});


const updateSubCategory = asyncHandler(async (req, res) => {
  const { subCategoryName, active, categoryId } = req.body;

  const subCategory = await Sub_Category.findById(req.params.id);

  if (!subCategory) {
    res.status(404);
    throw new Error("Sub-category not found.");
  }

  if (subCategoryName) {
    subCategory.subCategoryName = subCategoryName;
  }
  if (categoryId) {
    subCategory.categoryId = categoryId;
  }
  if (active !== undefined) {
    subCategory.active = active === 'true' || active === true;
  }

  if (req.file) {
    subCategory.subCategoryImage = req.file.filename;
  }


  const updatedSubCategory = await subCategory.save();

  res.status(200).json({
    success: true,
    message: "Sub-category updated successfully.",
    data: updatedSubCategory,
  });
});

const deleteSubCategory = asyncHandler(async (req, res) => {
  const subCategoryId = req.params.id;

  const sub_category = await Sub_Category.findByIdAndDelete(subCategoryId);

  if (!sub_category) {
    return res.status(404).json({
      success: false,
      message: "Sub Category not found with the provided ID."
    });
  }

  return res.status(200).json({
    success: true,
    message: "Sub Category deleted successfully."
  });
});

const getVendorStats = async (req, res) => {
  try {
    const { from, to } = req.query;

    const dateFilter = {};
    if (from && to) {
      dateFilter.createdAt = {
        $gte: moment.tz(from, "YYYY-MM-DD", "Asia/Kolkata").startOf('day').toDate(),
        $lte: moment.tz(to, "YYYY-MM-DD", "Asia/Kolkata").endOf('day').toDate(),
      };
    } else if (from) {
      dateFilter.createdAt = {
        $gte: moment.tz(from, "YYYY-MM-DD", "Asia/Kolkata").startOf('day').toDate()
      };
    } else if (to) {
      dateFilter.createdAt = {
        $lte: moment.tz(to, "YYYY-MM-DD", "Asia/Kolkata").endOf('day').toDate()
      };
    }

    const [stats] = await Vendor.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalListed: { $sum: 1 },
          totalPaid: {
            $sum: { $cond: [{ $eq: ["$isPayment", true] }, 1, 0] },
          },
          totalUnpaid: {
            $sum: { $cond: [{ $eq: ["$isPayment", false] }, 1, 0] },
          },
          totalArchived: {
            $sum: { $cond: [{ $eq: ["$isArchived", true] }, 1, 0] },
          },
          totalRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$isPayment", true] },
                    { $ne: ["$payuResponse.amount", null] },
                  ],
                },
                { $toDouble: "$payuResponse.amount" },
                0,
              ],
            },
          },
        },
      },
      { $project: { _id: 0 } }
    ]);

    return res.status(200).json({
      success: true,
      data: stats || {
        totalListed: 0,
        totalPaid: 0,
        totalUnpaid: 0,
        totalRevenue: 0,
        totalArchived: 0,
      },
      filterApplied: !!(from || to),
    });
  } catch (error) {
    console.error("Error fetching vendor stats:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getAllVendorSubscriptionDetails = asyncHandler(async (req, res) => {
  try {
    const {
      search,
      supplierStatus,
      paymentStatus,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      download,
    } = req.body;

    const query = {};

    if (search) {
      const searchConditions = [
        { "businessDetails.businessName": { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
        { "categories.categoryName": { $regex: search, $options: "i" } },
      ];

      // If the search term is a valid number, also search by sup_id
      if (!isNaN(Number(search))) {
        searchConditions.push({ "sup_id": Number(search) });
      }

      query.$or = searchConditions;
    }

    if (supplierStatus) {
      if (supplierStatus == "Archived") {
        query.isArchived = true;
      } else if (supplierStatus == "Paid") {
        query.isPayment = true;
        query.isArchived = false;
      } else if (supplierStatus == "Registered") {
        query.isPayment = false;
        query.isArchived = false;
      }
    }

    if (paymentStatus) {
      if (paymentStatus == "Successful") {
        query["payuResponse.status"] = "success";
      } else if (paymentStatus == "Failed") {
        query["payuResponse.status"] = "failure";
      } else if (paymentStatus == "Unpaid") {
        query["payuResponse.status"] = { $exists: false };
      }
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: moment.tz(startDate, "YYYY-MM-DD", "Asia/Kolkata").startOf('day').toDate(),
        $lte: moment.tz(endDate, "YYYY-MM-DD", "Asia/Kolkata").endOf('day').toDate(),
      };
    } else if (startDate) {
      query.createdAt = {
        $gte: moment.tz(startDate, "YYYY-MM-DD", "Asia/Kolkata").startOf('day').toDate()
      };
    } else if (endDate) {
      query.createdAt = {
        $lte: moment.tz(endDate, "YYYY-MM-DD", "Asia/Kolkata").endOf('day').toDate()
      };
    }

    const skip = (page - 1) * limit;

    if (download) {
      const vendorsToDownload = await Vendor.find(query).populate('categories.categoryId').sort({ createdAt: -1 });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Suppliers");

      worksheet.columns = [
        { header: "Sup ID", key: "sup_id", width: 15 },
        { header: "Business Name", key: "businessName", width: 30 },
        { header: "City", key: "city", width: 20 },
        { header: "Category", key: "category", width: 30 },
        { header: "Supplier Status", key: "supplierStatus", width: 20 },
        { header: "Payment Status", key: "paymentStatus", width: 20 },
        { header: "Date Registered", key: "createdAt", width: 20 },
        { header: "Onboarded By", key: "onboardedBy", width: 20 },
      ];

      vendorsToDownload.forEach((v) => {
        worksheet.addRow({
          sup_id: v.sup_id || "N/A",
          businessName: v.businessDetails?.businessName || "N/A",
          city: v.city || v.locationDetails?.city || "N/A",
          category:
            v.categories?.map((c) => c.categoryId?.categoryName).join(", ") || "N/A",
          supplierStatus: v.isArchived
            ? "Archived"
            : v.isPayment
              ? "Paid"
              : "Registered",
          paymentStatus:
            v.payuResponse?.status === "success"
              ? "Successful"
              : v.payuResponse?.status === "failure"
                ? "Failed"
                : "Unpaid",
          createdAt: v.createdAt.toLocaleDateString("en-IN"),
          onboardedBy: v.onboardedBy || null,
        });
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=SupplierList.xlsx"
      );

      await workbook.xlsx.write(res);
      return res.end();
    }

    // If not downloading, proceed with normal pagination
    const total = await Vendor.countDocuments(query);

    const vendors = await Vendor.find(query).populate('categories.categoryId')
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const transformedVendors = vendors.map((v) => {
      const supplierStatus = v.isArchived
        ? "Archived"
        : v.isPayment
          ? "Paid"
          : "Registered";

      const paymentStatus =
        v.payuResponse?.status === "success"
          ? "Successful"
          : v.payuResponse?.status === "failure"
            ? "Failed"
            : "Unpaid";

      const transformedCategories = v.categories.map(cat => cat.categoryId);


      return {
        ...v.toObject(),
        sup_id: v.sup_id,
        supplierStatus,
        paymentStatus,
        categories: transformedCategories,
      };
    });


    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      limit: Number(limit),
      data: transformedVendors,
    });
  } catch (error) {
    console.error("Error fetching vendors:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});


const getAllVendorDetails = asyncHandler(async (req, res) => {
  // Exclude the password field only
  const vendors = await Vendor.find().select("-password").populate("trackedBy", "name");

  if (!vendors || vendors.length === 0) {
    return res.status(200).json([]);
  }

  const transformedVendors = vendors.map((vendor) => ({
    ...vendor.toObject(),
    sup_id: vendor.sup_id,
    profileImage: vendor.profileImage
      ? `${process.env.APP_BASE_URL}/uploads/images/vendor/${vendor.profileImage}`
      : null,
  }));

  return res.status(200).json(transformedVendors);
});

// const getSuppliersEnquiryTracker = asyncHandler(async (req, res) => {
//   let { page = 1, limit = 10, search, download } = req.body;
//   page = parseInt(page);
//   limit = parseInt(limit);

//   const searchFilter = {
//     isPayment: false,
//   };

//   // We need to handle search on a populated field (trackedBy.name)
//   // So, we'll apply the search filter *after* the lookup if search is present.
//   const postLookupSearchFilter = {};
//   if (search) {
//     const regex = new RegExp(search, "i");
//     postLookupSearchFilter.$or = [
//       { "businessDetails.businessName": regex },
//       { "locationDetails.city": regex },
//       { "categories.categoryName": regex },
//       { "trackedBy.name": regex }, // Search on the populated name
//       { onboardedBy: regex },
//     ];
//   }

//   // Main aggregation
//   let aggregationPipeline = [
//     { $match: searchFilter },

//     // Join with Enquiry collection
//     {
//       $lookup: {
//         from: "enquiries",
//         localField: "_id",
//         foreignField: "vendorId",
//         as: "enquiries",
//         pipeline: [
//           {
//             $lookup: {
//               from: "customers",
//               localField: "customerId",
//               foreignField: "_id",
//               as: "customer",
//             },
//           },
//           { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
//           {
//             $project: {
//               createdAt: 1,
//               enquiryStatus: 1,
//               comment: 1,
//               enquiryType: { $literal: "Chat" },
//               restaurantName: "$customer.restaurant_name",
//             },
//           },
//           { $sort: { createdAt: -1 } },
//         ],
//       },
//     },

//     {
//       $addFields: {
//         totalEnquiries: { $size: "$enquiries" },
//         lastEnquiryDate: { $max: "$enquiries.createdAt" },
//       },
//     },

//     { $sort: { lastEnquiryDate: -1 } },

//     {
//       $project: {
//         _id: 1,
//         "businessDetails.businessName": 1,
//         city: { $ifNull: ["$locationDetails.city", "$city"] },
//         trackedBy: "$trackedBy.name", // Project only the name
//         trackedBy: 1, // Keep the original trackedBy ObjectId for population
//         onboardedBy: 1,
//         categories: 1,
//         totalEnquiries: 1,
//         lastEnquiryDate: 1,
//         mobile: 1,
//         enquiries: 1,
//       },
//     },
//   ];

//   // Apply search filter after lookups if a search term is provided
//   if (search) {
//     aggregationPipeline.push({ $match: postLookupSearchFilter });
//   }

//   // Clone the pipeline for counting before adding pagination
//   const countPipeline = [...aggregationPipeline, { $count: "totalCount" }];

//   // Add pagination to the main pipeline if not downloading
//   if (!download) {
//     aggregationPipeline.push({ $skip: (page - 1) * limit }, { $limit: limit });
//   }

//   let vendors = await Vendor.aggregate(aggregationPipeline);

//   // ✅ Populate trackedBy using Mongoose populate for aggregation results
//   vendors = await Vendor.populate(vendors, {
//     path: "trackedBy",
//     select: "name", // choose fields you need
//   });
//   console.log(vendors);

//   // Excel Download
//   const vendors = await Vendor.aggregate(aggregationPipeline);
//   if (download === "true") {
//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet("Suppliers Enquiry Tracker");

//     worksheet.columns = [
//       { header: "Sup ID", key: "_id", width: 24 },
//       { header: "Business Name", key: "businessName", width: 30 },
//       { header: "City", key: "city", width: 20 },
//       { header: "Mobile Number", key: "mobile", width: 20 },
//       { header: "Category", key: "category", width: 30 },
//       { header: "Total Enquiries", key: "totalEnquiries", width: 20 },
//       { header: "Tracked By", key: "trackedBy", width: 20 },
//       { header: "Last Enquiry Date", key: "lastEnquiryDate", width: 25 },
//     ];

//     vendors.forEach((v) => {
//       worksheet.addRow({
//         _id: v._id.toString(),
//         businessName: v.businessDetails?.businessName || "-",
//         city: v.city || "-",
//         mobile: v.mobile || "-",
//         category: v.categories?.map((c) => c.categoryName).join(", ") || "-",
//         totalEnquiries: v.totalEnquiries || 0,
//         trackedBy: v.trackedBy || "-",
//         trackedBy: v.trackedBy || "-", // This now correctly accesses the projected name
//         lastEnquiryDate: v.lastEnquiryDate
//           ? new Date(v.lastEnquiryDate).toLocaleDateString("en-IN")
//           : "-",
//       });
//     });

//     res.setHeader(
//       "Content-Disposition",
//       "attachment; filename=Suppliers_Enquiry_Tracker.xlsx"
//     );
//     res.setHeader(
//       "Content-Type",
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//     );

//     await workbook.xlsx.write(res);
//     return res.end();
//   }

//   // Execute the count pipeline
//   const totalCountResult = await Vendor.aggregate(countPipeline);
//   const totalCount = totalCountResult.length > 0 ? totalCountResult[0].totalCount : 0;

//   const transformedVendors = vendors.map(v => ({
//     ...v,
//     trackedBy: v.trackedBy || null,
//     trackedBy: v.trackedBy?.name || null, // Access the name from the populated object
//   }));

//   // Excel Download (moved here to use populated data)
//   if (download === "true") {
//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet("Suppliers Enquiry Tracker");

//     worksheet.columns = [
//       { header: "Sup ID", key: "_id", width: 24 },
//       { header: "Business Name", key: "businessName", width: 30 },
//       { header: "City", key: "city", width: 20 },
//       { header: "Mobile Number", key: "mobile", width: 20 },
//       { header: "Category", key: "category", width: 30 },
//       { header: "Total Enquiries", key: "totalEnquiries", width: 20 },
//       { header: "Tracked By", key: "trackedBy", width: 20 },
//       { header: "Last Enquiry Date", key: "lastEnquiryDate", width: 25 },
//     ];

//     transformedVendors.forEach((v) => {
//       worksheet.addRow({
//         _id: v._id.toString(),
//         businessName: v.businessDetails?.businessName || "-",
//         city: v.city || "-",
//         mobile: v.mobile || "-",
//         category: v.categories?.map((c) => c.categoryName).join(", ") || "-",
//         totalEnquiries: v.totalEnquiries || 0,
//         trackedBy: v.trackedBy || "-", // Now v.trackedBy is the name
//         lastEnquiryDate: v.lastEnquiryDate
//           ? new Date(v.lastEnquiryDate).toLocaleDateString("en-IN")
//           : "-",
//       });
//     });

//     res.setHeader("Content-Disposition", "attachment; filename=Suppliers_Enquiry_Tracker.xlsx");
//     res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

//     await workbook.xlsx.write(res);
//     return res.end();
//   }

//   res.status(200).json({
//     totalCount,
//     currentPage: page,
//     totalPages: Math.ceil(totalCount / limit),
//     data: transformedVendors,
//   });
// });

const getSuppliersEnquiryTracker = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10, search, download } = req.body;
  page = parseInt(page);
  limit = parseInt(limit);

  const searchFilter = {
    isPayment: false,
  };

  // We need to handle search on a populated field (trackedBy.name)
  // So, we'll apply the search filter *after* the lookup if search is present.
  let postLookupSearchFilter = {};
  if (search) {
    const regex = new RegExp(search, "i");
    const searchConditions = [
      { "businessDetails.businessName": regex },
      { "locationDetails.city": regex },
      { "categories.categoryName": regex },
      { "trackedBy.name": regex }, // Search on the populated name
      { onboardedBy: regex },
    ];

    // If the search term is a valid number, also search by sup_id
    if (!isNaN(Number(search))) {
      searchConditions.push({ "sup_id": Number(search) });
    }
    postLookupSearchFilter.$or = searchConditions;
  }

  // Main aggregation
  let aggregationPipeline = [
    { $match: searchFilter },

    // ✅ Add lookup for trackedBy (Employee collection)
    {
      $lookup: {
        from: "employees", // Replace with your actual employee collection name
        localField: "trackedBy",
        foreignField: "_id",
        as: "trackedByEmployee",
      },
    },
    {
      $unwind: {
        path: "$trackedByEmployee",
        preserveNullAndEmptyArrays: true, // Keep vendors even if no employee found
      },
    },

    // Join with Enquiry collection
    {
      $lookup: {
        from: "enquiries",
        localField: "_id",
        foreignField: "vendorId",
        as: "enquiries",
        pipeline: [
          {
            $lookup: {
              from: "customers",
              localField: "customerId",
              foreignField: "_id",
              as: "customer",
            },
          },
          { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              createdAt: 1,
              enquiryStatus: 1,
              comment: 1,
              enquiryType: { $literal: "Chat" },
              restaurantName: "$customer.restaurant_name",
            },
          },
          { $sort: { createdAt: -1 } },
        ],
      },
    },

    {
      $addFields: {
        totalEnquiries: { $size: "$enquiries" },
        lastEnquiryDate: { $max: "$enquiries.createdAt" },
      },
    },

    { $sort: { lastEnquiryDate: -1 } },

    {
      $project: {
        _id: 1,
        sup_id: 1, // 👈 Add this line
        "businessDetails.businessName": 1,
        city: { $ifNull: ["$locationDetails.city", "$city"] },
        trackedBy: "$trackedByEmployee.name", // Get the employee name
        onboardedBy: 1,
        categories: 1,
        totalEnquiries: 1,
        lastEnquiryDate: 1,
        mobile: 1,
        enquiries: 1,
      },
    },
  ];

  // Apply search filter after lookups if a search term is provided
  if (search) {
    aggregationPipeline.push({ $match: postLookupSearchFilter });
  }

  // Clone the pipeline for counting before adding pagination
  const countPipeline = [...aggregationPipeline, { $count: "totalCount" }];

  // Add pagination to the main pipeline if not downloading
  if (!download) {
    aggregationPipeline.push({ $skip: (page - 1) * limit }, { $limit: limit });
  }

  const vendors = await Vendor.aggregate(aggregationPipeline);

  // ✅ No need for Mongoose populate anymore since we're doing lookup in aggregation

  // Transform vendors for both JSON response and Excel export
  const transformedVendors = vendors.map(v => ({
    ...v,
    sup_id: v.sup_id,
    trackedBy: v.trackedBy || null,
  }));

  if (download) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Suppliers Enquiry Tracker");

    worksheet.columns = [
      { header: "Sup ID", key: "sup_id", width: 15 },
      { header: "Business Name", key: "businessName", width: 30 },
      { header: "City", key: "city", width: 20 },
      { header: "Mobile Number", key: "mobile", width: 20 },
      { header: "Category", key: "category", width: 30 },
      { header: "Total Enquiries", key: "totalEnquiries", width: 20 },
      { header: "Tracked By", key: "trackedBy", width: 20 },
      { header: "Last Enquiry Date", key: "lastEnquiryDate", width: 25 },
    ];

    transformedVendors.forEach((v) => {
      worksheet.addRow({
        sup_id: v.sup_id || "N/A",
        businessName: v.businessDetails?.businessName || "-",
        city: v.city || "-",
        mobile: v.mobile || "-",
        category: v.categories?.map((c) => c.categoryName).join(", ") || "-",
        totalEnquiries: v.totalEnquiries || 0,
        trackedBy: v.trackedBy || "-",
        lastEnquiryDate: v.lastEnquiryDate
          ? new Date(v.lastEnquiryDate).toLocaleDateString("en-IN")
          : "-",
      });
    });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Suppliers_Enquiry_Tracker.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    return res.end();
  }

  // Execute the count pipeline
  const totalCountResult = await Vendor.aggregate(countPipeline);
  const totalCount = totalCountResult.length > 0 ? totalCountResult[0].totalCount : 0;

  res.status(200).json({
    totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / limit),
    data: transformedVendors,
  });
});

const getEmployeeList = asyncHandler(async (req, res) => {
  try {
    const employees = await Employee.find().sort({ name: 1 });

    if (!employees || employees.length === 0) {
      return res.status(200).json([]);
    }

    return res.status(200).json({ success: true, data: employees });
  } catch (error) {
    console.error("Error fetching employee list:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
})

const setTrackedByForVendors = asyncHandler(async (req, res) => {
  try {
    const { vendorId, employeeId } = req.body;

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found with the provided ID."
      });
    }

    vendor.trackedBy = employeeId;
    await vendor.save();

    return res.status(200).json({
      success: true,
      message: "Tracked By updated successfully",
      data: vendor
    });
  } catch (error) {
    console.error("Error updating trackedBy:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
})


// const addBaner = asyncHandler(async (req, res) => {
//   const { title, imageUrl } = req.body;
//   const newBanner = new Banner({
//     title,
//     imageUrl,
//   });
//   const savedBanner = await newBanner.save();
//   res.status(201).json({
//     success: true,
//     message: "Banner added successfully.",
//     data: savedBanner,
//   });
// });


module.exports = {
  registerAdmin,
  loginAdmin,
  getAllVendorDetails,
  getVendorStats,
  getAllVendorSubscriptionDetails,
  logoutAdmin,
  refreshAccessAndRefreshTokensForAdmin,
  getVendorDetails,
  updateVendor,
  addVendor,
  createCategory,
  getCategory,
  getAllCategory,
  fetchAllCategories,
  updateCategory,
  createSubCategory,
  getSubCategory,
  getAllSubCategory,
  updateSubCategory,
  getSuppliersEnquiryTracker,
  setTrackedByForVendors,
  getEmployeeList,
  deleteVendor,
  deleteSubCategory,
  deleteCategory,
  // addBaner,
  // updateBaner,
  // deleteBaner,
  // getAllBanners,
}