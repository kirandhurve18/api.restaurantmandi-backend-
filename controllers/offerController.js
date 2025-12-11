const asyncHandler = require("express-async-handler");
const Vendor = require("../models/vendorModel");
const Offer = require("../models/offerModel");

const createOffer = asyncHandler(async (req, res) => {
  const {
    vendorId,
    categoryId,
    subCategoryId,
    productId,
    title,
    offer,
    description,
  } = req.body;

  if (!vendorId) {
    return res
      .status(400)
      .json({ message: "Vendor Id is required", success: false });
  }
  // if (!categoryId) {
  //   return res
  //     .status(400)
  //     .json({ message: "Category Id is required", success: false });
  // }
  // if (!subCategoryId) {
  //   return res
  //     .status(400)
  //     .json({ message: "Sub Category Id is required", success: false });
  // }
  // if (!productId) {
  //   return res
  //     .status(400)
  //     .json({ message: "Product Id is required", success: false });
  // }

  if (!title) {
    return res.json({ message: "Offer title is required", success: false });
  }

  const vendor = await Vendor.findById(vendorId);

  if (!vendor) {
    return res.json({ message: "Vendor not found", success: false });
  }

  const createOffer = await Offer.create({
    vendorId,
    categoryId,
    subCategoryId,
    productId,
    title,
    offer,
    description,
  });

  if (!createOffer)
    return res.json({ message: "Offer not created", success: false });

  res.status(201).json({ data: createOffer, success: true });
});

const getVendorOffers = asyncHandler(async (req, res) => {
  const vendorId = req.query.vendorId;

  if (!vendorId) {
    return res.json({ message: "Vendor Id is required", success: false });
  }

  const offers = await Offer.find({ vendorId: vendorId }).sort({
    createdAt: -1,
  });

  if (!offers || offers.length === 0) {
    return res.json({ message: "No offers found", success: false });
  }

  res.json({ data: offers, success: true });
});

module.exports = { createOffer, getVendorOffers };
