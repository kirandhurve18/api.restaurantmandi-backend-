const asyncHandler = require("express-async-handler");

const Category = require("../models/categoryModel");
const Vendor = require("../models/vendorModel");

// @desc Create a new category
// @route POST /api/category
const createCategory = asyncHandler(async (req, res) => {
  const { categoryName } = req.body;

  if (!categoryName) {
    return res
      .status(400)
      .json({ message: "Please provide the category name.", success: false });
  }

  let data = {
    categoryName,
  };

  if (req.file) {
    const filenameWithoutSpaces = req.file.filename.replace(/\s+/g, "");
    data.categoryImage = filenameWithoutSpaces;
  }

  const category = await Category.create(data);

  if (category) {
    const imageUrl = `${process.env.APP_BASE_URL}/uploads/images/category/${category.categoryImage}`;

    return res.status(201).json({
      _id: category._id,
      categoryName: category.categoryName,
      categoryImage: imageUrl,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      success: true,
    });
  } else {
    return res
      .status(500)
      .json({ message: "Category creation failed.", success: false });
  }
});

// @desc Get category
// @route GET /api/category/:id
const getCategory = asyncHandler(async (req, res) => {
  const categoryId = req?.params?.id;

  if (!categoryId) {
    return res
      .status(500)
      .json({ message: "Please provide the category Id.", success: false });
  }

  const category = await Category.findById(categoryId);

  if (!category) {
    return res
      .status(500)
      .json({ message: "Category Not Found!", success: false });
  }

  const imageUrl = `${process.env.APP_BASE_URL}/uploads/images/category/${category.categoryImage}`;

  res.status(200).json({
    _id: category._id,
    categoryName: category.categoryName,
    categoryImage: imageUrl,
    success: true,
  });
});

// @desc Get all categories within a Vendor
// @route GET /api/category/vendor/:id
const getVendorCategories = asyncHandler(async (req, res) => {
  const vendorId = req?.params?.id;

  if (!vendorId) {
    return res
      .status(400)
      .json({ message: "Please provide the Vendor ID", success: false });
  }

  const vendor = await Vendor.findById(vendorId);

  if (!vendor) {
    return res
      .status(404)
      .json({ message: "Vendor not found", success: false });
  }

  if (vendor?.categories?.length === 0) {
    return res.status(200).json({
      message: "No Categories found for this vendor!",
      success: false,
    });
  }

  res.status(200).json({ data: vendor?.categories, success: true });
});

// Mobile App
// @desc Get all categories within a Vendor
// @route GET /api/category/vendor/:id
const getVendorRelatedCategories = asyncHandler(async (req, res) => {
  const vendorId = req?.query?.vendorId;

  if (!vendorId) {
    return res.status(500).send(false);
  }

  // Find the vendor by ID
  const vendor = await Vendor.findById(vendorId);

  if (!vendor) {
    return res.status(500).send(false);
  }

  if (!vendor.categories || vendor.categories.length === 0) {
    return res.status(201).send([]);
  }

  // Extract category IDs from the vendor's categories array
  const categoryIds = vendor.categories.map((category) => category.categoryId);

  // Find all categories that match the extracted category IDs
  const categories = await Category.find({ _id: { $in: categoryIds } });

  if (!categories || categories.length === 0) {
    return res.status(201).send([]);
  }

  // Transform categories if needed
  const transformedCategories = categories.map((category) => ({
    _id: category._id,
    name: category.categoryName,
    image: `${process.env.APP_BASE_URL}/uploads/images/category/${category.categoryImage}`,
  }));

  res.status(200).send(transformedCategories);
});

const toggleCategoryShowOnHome = asyncHandler(async (req, res) => {
  const { categoryId } = req.body;

  if (!categoryId) {
    return res
      .status(400)
      .json({ message: "Please provide categoryId", success: false });
  }

  const category = await Category.findById(categoryId);
  if (!category) {
    return res
      .status(404)
      .json({ message: "Category not found", success: false });
  }

  // Toggle the boolean value
  category.showOnHome = !category.showOnHome;
  await category.save({ validateBeforeSave: false });

  res.status(200).json({
    message: `Category showOnHome toggled to ${category.showOnHome}`,
    showOnHome: category.showOnHome,
    success: true,
  });
});

// @desc Get all categories
// @route GET /api/category/all
// const getAllCategories = asyncHandler(async (req, res) => {
//   const categories = await Category.find();

//   if (!categories || categories.length === 0) {
//     return res.status(500).send(false);
//   }

//   return res.status(200).json({ data: categories, success: true });
// });

const getAllCategories = asyncHandler(async (req, res) => {
  // const categories = await Category.find();
  const categories = await Category.find({ vendorId: { $in: [null, undefined] } });

  if (!categories || categories.length === 0) {
    return res.status(500).send(false);
  }

  const categoriesWithFullImage = categories.map((cat) => {
    return {
      ...cat._doc,
      image: cat.categoryImage ? `${process.env.APP_BASE_URL}/uploads/images/category/` + cat.categoryImage : "", // prepend base URL
    };
  });

  return res.status(200).json({ data: categoriesWithFullImage, success: true });
});

const fetchAllCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().select(
    "_id categoryName categoryImage"
  );

  if (!categories || categories.length === 0) {
    return res.status(201).send([]);
  }

  const transformedCategories = categories.map((category) => ({
    _id: category._id,
    name: category.categoryName,
    image: `${process.env.APP_BASE_URL}/uploads/images/category/${category.categoryImage}`,
  }));

  return res.status(200).send(transformedCategories);
});

// @desc Update Category
// @route PUT /api/category/:id
const updateCategory = asyncHandler(async (req, res) => {
  const categoryId = req?.params?.id;

  if (!categoryId) {
    return res
      .status(400)
      .json({ message: "Please provide the category Id.", success: false });
  }

  const categoryExists = await Category.findById(categoryId);

  if (!categoryExists) {
    res.status(404).json({ message: "Category not found!", success: false });
  }

  let data = req?.body;

  if (req.file) {
    const filenameWithoutSpaces = req.file.filename.replace(/\s+/g, "");
    data.categoryImage = filenameWithoutSpaces;
  }

  const category = await Category.findByIdAndUpdate(categoryId, data, {
    new: true,
  });

  if (!category) {
    res
      .status(500)
      .json({ message: "Error while updating category!", success: false });
  }

  const imageUrl = `${process.env.APP_BASE_URL}/uploads/images/category/${category.categoryImage}`;

  res.status(200).json({
    _id: category._id,
    categoryName: category.categoryName,
    categoryImage: imageUrl,
    success: true,
  });
});

// @desc Delete Category
// @route DELETE /api/category/:id
const deleteCategory = asyncHandler(async (req, res) => {
  const categoryId = req?.params?.id;

  if (!categoryId) {
    res.status(400);
    throw new Error("Please provide the category Id.");
  }

  const category = await Category.findById(categoryId);

  if (!category) {
    res.status(404);
    throw new Error("Category Not Found!");
  }

  await Category.deleteOne({ _id: categoryId });

  res.status(200).json({ success: true });
});

module.exports = {
  createCategory,
  getCategory,
  getVendorCategories,
  getAllCategories,
  updateCategory,
  deleteCategory,
  fetchAllCategories,
  getVendorRelatedCategories,
  toggleCategoryShowOnHome
};
