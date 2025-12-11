const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const Category = require("../models/categoryModel");
const Vendor = require("../models/vendorModel");
const SubCategory = require("../models/subCategoryModel");

// @route POST /api/home
const getHomePageData = asyncHandler(async (req, res) => {
  const category = await Category.find().limit(7);

  const transformedCategories = category.map((category) => ({
    _id: category._id,
    name: category.categoryName,
    image: `${process.env.APP_BASE_URL}/uploads/images/category/${category.categoryImage}`,
  }));

  const vendor = await Vendor.find({ isPayment: true }).limit(3);

  const transformedVendors = vendor.map((vendor) => ({
    _id: vendor._id,
    name: vendor?.businessDetails?.businessName,
    image: `${process.env.APP_BASE_URL}/uploads/images/vendor/${vendor.profileImage}`,
  }));

  res.status(200).json({
    sliderArray: [
      {
        image:
          `${process.env.APP_BASE_URL}/uploads/images/banner/banner-1.jpg`,
      },
      {
        image:
          `${process.env.APP_BASE_URL}/uploads/images/banner/banner-2.jpg`,
      },
      {
        image:
          `${process.env.APP_BASE_URL}/uploads/images/banner/banner-1.jpg`,
      },
    ],
    topCategoryArray: [
      transformedCategories[0],
      transformedCategories[1],
      transformedCategories[2],
    ],
    topBrandArray: transformedVendors,
    groceryItemsArray: transformedCategories,
    homePageCallStatus: true,
  });
});

const maintenaceData = asyncHandler(async (req, res) => {
  const ids = [
    "666c12785676c7cbb59d0764",
    "666c1e19b1bdcc685faaf513",
    "666c1e25b1bdcc685faaf516",
    "666c12a65676c7cbb59d076d",
  ];

  // Find subcategories with matching category IDs
  const subCategories = await SubCategory.find({
    categoryId: { $in: ids },
  }).populate([
    {
      path: "categoryId",
      select: "categoryName",
    },
  ]);

  // Initialize an empty array to store the structured data
  const structuredData = [];

  // Define the order of categories
  const categoryOrder = [
    "Packaging Material",
    "Banking & Finance",
    "Maintenance Services",
    "Uniform & Other Products",
  ];

  // Create a map to store subcategories by category name
  const subCategoriesByCategory = new Map();

  // Group subcategories by category name
  subCategories.forEach((subCategory) => {
    if (!subCategoriesByCategory.has(subCategory?.categoryId?.categoryName)) {
      subCategoriesByCategory.set(subCategory?.categoryId?.categoryName, []);
    }
    subCategoriesByCategory.get(subCategory?.categoryId?.categoryName).push({
      _id: subCategory._id,
      name: subCategory.subCategoryName,
      image: `${process.env.APP_BASE_URL}/uploads/images/subCategory/${subCategory.subCategoryImage}`,
    });
  });

  // Create a map to associate category names with their IDs
  const categoryIds = {
    "Packaging Material": "666c12785676c7cbb59d0764",
    "Banking & Finance": "666c1e19b1bdcc685faaf513",
    "Maintenance Services": "666c1e25b1bdcc685faaf516",
    "Uniform & Other Products": "666c12a65676c7cbb59d076d",
  };

  // Iterate over categories in the desired order
  categoryOrder.forEach((categoryName) => {
    if (subCategoriesByCategory.has(categoryName)) {
      structuredData.push({
        _id: categoryIds[categoryName], // Include the category ID
        name: categoryName,
        arraydata: subCategoriesByCategory.get(categoryName),
      });
    }
  });

  res.status(200).json(structuredData);
});

const getBanners = asyncHandler(async (req, res) => {
  const img1 = `${process.env.APP_BASE_URL}/uploads/images/banner/banner-1.jpg`;
  const img2 = `${process.env.APP_BASE_URL}/uploads/images/banner/banner-2.jpg`;

  const banner = [img1, img2];

  res.status(200).json({ data: banner, success: true });
});

module.exports = {
  getHomePageData,
  maintenaceData,
  getBanners,
};
