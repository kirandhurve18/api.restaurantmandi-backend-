const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sub_Category",
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    productImage: {
      type: [],
    },
    singlePrice: {
      price: { type: Number, default: null },
      unit: { type: String, default: null },
      minOrderQty: { type: Number, default: null },
      minOrderQtyUnit: { type: String, default: null },
    },
    priceRange: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      unit: { type: String, default: null },
      minOrderQty: { type: Number, default: null },
      minOrderQtyUnit: { type: String, default: null },
    },
    priceBasedOnQty: {
      price: { type: Number, default: null },
      unit: { type: String, default: null },
      minOrderQty: { type: Number, default: null },
      minOrderQtyUnit: { type: String, default: null },
    },
    specification: {
      inputs: [
        {
          input1: { type: String, default: null },
          input2: { type: String, default: null },
        },
      ],
    },
    manufacturer: {
      name: { type: String },
      details: { type: String },
    },
    countryOrigin: {
      type: String,
    },
    city: {
      type: String,
    },
    description: {
      type: String,
    },
    sellerSkuId: {
      type: String,
    },
    attachment: {
      type: [],
    },
    isService: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
