const asyncHandler = require("express-async-handler");

const Category = require("../models/categoryModel");
// const Vendor = require("../models/vendorModel");
const SubCategory = require("../models/subCategoryModel");

// @desc Create a new sub category
// @route POST /api/sub-category
const createSubCategory = asyncHandler(async (req, res) => {
  // const { categoryId, categoryName, subCategoryName } = req.body;
  const { categoryId, subCategoryName } = req.body;

  if (!categoryId) {
    
    return res
      .status(400)
      .json({ message: "Please provide the category ID.", success: false });
  }

  if (!subCategoryName) {
    return res.status(400).json({
      message: "Please provide the sub category name.",
      success: false,
    });
  }

  const categoryExists = await Category.findById(categoryId);

  if (!categoryExists) {
    return res
      .status(400)
      .json({ message: "Category does not exists!", success: false });
  }

  let data = {
    categoryId,
    // categoryName,
    subCategoryName,
  };

  if (req.file) {
    const filenameWithoutSpaces = req.file.filename.replace(/\s+/g, "");
    data.subCategoryImage = filenameWithoutSpaces;
  }

  const subCategory = await SubCategory.create(data);

  if (subCategory) {
    const imageUrl = `${process.env.APP_BASE_URL}/uploads/images/subCategory/${subCategory.subCategoryImage}`;

    return res.status(201).json({
      _id: subCategory._id,
      categoryId: subCategory.categoryId,
      subCategoryName: subCategory.subCategoryName,
      subCategoryImage: imageUrl,
      createdAt: subCategory.createdAt,
      updatedAt: subCategory.updatedAt,
      success: true,
    });
  } else {
    return res
      .status(500)
      .json({ message: "Sub Category creation failed.", success: false });
  }
});

// @desc Get sub-category
// @route GET /api/sub-category/:id
const getSubCategory = asyncHandler(async (req, res) => {
  const subCategoryId = req?.params?.id;

  if (!subCategoryId) {
    return res
      .status(500)
      .json({ message: "Please provide the sub category ID.", success: false });
  }

  const subCategory = await SubCategory.findById(subCategoryId).populate([
    {
      path: "categoryId",
      select: "categoryName",
    },
  ]);

  if (!subCategory) {
    return res
      .status(500)
      .json({ message: "Sub Category Not Found!", success: false });
  }

  const imageUrl = `${process.env.APP_BASE_URL}/uploads/images/subCategory/${subCategory.subCategoryImage}`;

  res.status(200).json({
    _id: subCategory._id,
    categoryId: subCategory.categoryId._id,
    categoryName: subCategory.categoryId.categoryName,
    subCategoryName: subCategory.subCategoryName,
    subCategoryImage: imageUrl,
    success: true,
  });
});

// @desc Get all sub categories within a category
// @route GET /api/sub-category/category/:id
const getSubCategoriesCategory = asyncHandler(async (req, res) => {
  const categoryId = req?.params?.id;

  if (!categoryId) {
    return res
      .status(400)
      .json({ message: "Please provide the Category ID.", success: false });
  }

  const category = await Category.findById(categoryId);

  if (!category) {
    return res
      .status(404)
      .json({ message: "Category not found!", success: false });
  }

  const subCategory = await SubCategory.find({
    categoryId: categoryId,
  }).populate([
    {
      path: "categoryId",
      select: "categoryName",
    },
  ]);

  if (!subCategory || subCategory.length === 0) {
    return res
      .status(404)
      .json({ message: "No result found!", success: false });
  }

  const data = subCategory.map((subCategory) => ({
    _id: subCategory._id,
    categoryId: subCategory.categoryId._id,
    categoryName: subCategory.categoryId.categoryName,
    subCategoryName: subCategory.subCategoryName,
    subCategoryImage: `/uploads/images/subCategory/${subCategory.subCategoryImage}`,
  }));

  res
    .status(200)
    .json({ data: data, count: subCategory.length, success: true });
});

// @desc Get all sub categories within a category for mobile app
// @route GET /api/sub-category?catId=
const getSubCategoriesWithinCategory = asyncHandler(async (req, res) => {
  const categoryId = req?.query?.catId;

  if (!categoryId) {
    return res
      .status(400)
      .json({ message: "Please provide the Category ID.", success: false });
  }

  const category = await Category.findById(categoryId);

  if (!category) {
    return res
      .status(404)
      .json({ message: "Category not found!", success: false });
  }

  const subCategory = await SubCategory.find({ categoryId: categoryId });

  if (!subCategory || subCategory.length === 0) {
    return res.status(201).send([]);
  }

  const transformedSubCategory = subCategory.map((subCategory) => ({
    _id: subCategory._id,
    name: subCategory.subCategoryName,
    image: `${process.env.APP_BASE_URL}/uploads/images/subCategory/${subCategory.subCategoryImage}`,
  }));

  return res.status(200).send(transformedSubCategory);
});

// @desc Get all sub categories
// @route GET /api/sub-category/all
const getAllSubCategories = asyncHandler(async (req, res) => {
  const subCategories = await SubCategory.find().populate([
    {
      path: "categoryId",
      select: "categoryName",
    },
  ]);

  if (!subCategories || subCategories.length === 0) {
    return res.status(201).send([]);
  }

  const data = subCategories.filter(subCategory => subCategory.categoryId !== null).map((subCategory) => ({
    _id: subCategory._id,
    categoryId: subCategory.categoryId._id,
    categoryName: subCategory.categoryId.categoryName,
    subCategoryName: subCategory.subCategoryName,
    subCategoryImage: `${process.env.APP_BASE_URL}/uploads/images/subCategory/${subCategory.subCategoryImage}`,
  }));

  return res
    .status(200)
    .json({ data, count: subCategories.length, success: true });
});

// @desc Update Sub Category
// @route PUT /api/sub-category/:id
const updateSubCategory = asyncHandler(async (req, res) => {
  const subCategoryId = req?.params?.id;

  if (!subCategoryId) {
    return res
      .status(400)
      .json({ message: "Please provide the sub category ID.", success: false });
  }

  const subCategoryExists = await SubCategory.findById(subCategoryId);

  if (!subCategoryExists) {
    res
      .status(404)
      .json({ message: "Sub Category not found!", success: false });
  }

  let data = req?.body;

  if (req.file) {
    const filenameWithoutSpaces = req.file.filename.replace(/\s+/g, "");
    data.subCategoryImage = filenameWithoutSpaces;
  }

  const subCategory = await SubCategory.findByIdAndUpdate(subCategoryId, data, {
    new: true,
  });

  if (!subCategory) {
    res
      .status(500)
      .json({ message: "Error while updating subCategory!", success: false });
  }

  const imageUrl = `${process.env.APP_BASE_URL}/uploads/images/subCategory/${subCategory.subCategoryImage}`;

  res.status(200).json({
    _id: subCategory._id,
    categoryId: subCategory.categoryId,
    subCategoryName: subCategory.subCategoryName,
    subCategoryImage: imageUrl,
    success: true,
  });
});

// @desc Delete Sub Category
// @route DELETE /api/sub-category/:id
const deleteSubCategory = asyncHandler(async (req, res) => {
  const subCategoryId = req?.params?.id;

  if (!subCategoryId) {
    return res
      .status(400)
      .json({ message: "Please provide the sub category ID.", success: false });
  }

  const subCategory = await SubCategory.findById(subCategoryId);

  if (!subCategory) {
    return res
      .status(404)
      .json({ message: "Sub Category Not Found!", success: false });
  }

  await SubCategory.deleteOne({ _id: subCategoryId });

  res.status(200).json({ success: true });
});

module.exports = {
  createSubCategory,
  getSubCategory,
  getSubCategoriesCategory,
  getAllSubCategories,
  updateSubCategory,
  deleteSubCategory,
  getSubCategoriesWithinCategory,
};
