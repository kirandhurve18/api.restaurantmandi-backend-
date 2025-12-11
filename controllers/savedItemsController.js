const asyncHandler = require("express-async-handler");

const SavedItem = require("../models/savedItemsModel");
const Vendor = require("../models/vendorModel");
const Customer = require("../models/customerModel");
const Product = require("../models/productModel");
const Enquiry = require("../models/enquiryModel");

const saveItem = asyncHandler(async (req, res) => {
  const { vendorId, customerId, productId } = req.body;

  if (!vendorId) {
    return res
      .status(400)
      .json({ message: "Vendor ID is required", success: false });
  }
  if (!customerId) {
    return res
      .status(400)
      .json({ message: "Customer ID is required", success: false });
  }
  if (!productId) {
    return res
      .status(400)
      .json({ message: "Product ID is required", success: false });
  }

  const [vendor, customer, product] = await Promise.all([
    Vendor.findById(vendorId).exec(),
    Customer.findById(customerId).exec(),
    Product.findById(productId).exec(),
  ]);

  if (!vendor) {
    return res
      .status(404)
      .json({ message: "Vendor not found", success: false });
  }
  if (!customer) {
    return res
      .status(404)
      .json({ message: "Customer not found", success: false });
  }
  if (!product) {
    return res
      .status(404)
      .json({ message: "Product not found", success: false });
  }

  // Check if the same vendorId, customerId, and productId combination already exists
  const existingItem = await SavedItem.findOne({
    vendorId,
    customerId,
    productId,
  }).exec();

  if (existingItem) {
    return res
      .status(400)
      .json({ message: "This item is already saved!", success: false });
  }

  const item = await SavedItem.create({
    vendorId,
    customerId,
    productId,
    isSaved: true,
  });

  if (!item) {
    return res
      .status(400)
      .json({ message: "Error while saving item!", success: false });
  }

  let yearDifference;

  if (vendor?.establishment?.year) {
    const establishmentYear = vendor?.establishment?.year || 0;

    if (establishmentYear > 0) {
      const currentYear = new Date().getFullYear();

      yearDifference = currentYear - establishmentYear;
    }
  }

  const enquiry = await Enquiry.find({ productId });

  const data = {
    _id: item._id,
    customerId: item.customerId,
    productId: item.productId,
    name: product?.productName || "",
    image:
      `${process.env.APP_BASE_URL}/uploads/images/product/${product?.productImage[0]}` ||
      "",
    price: product.singlePrice.price ? product.singlePrice.price : "",
    city: vendor?.locationDetails?.city || "",
    vendorId: item.vendorId,
    vendorName: vendor.name,
    description: product?.description || "",
    mobile: vendor?.mobile || "",
    year: yearDifference || 0,
    verified: true,
    enquiries: enquiry?.length ? enquiry?.length : 0,
    isSaved: true,
    isService: product?.isService,
  };

  res.status(201).json({ data: data, success: true });
});

const getSavedItems = asyncHandler(async (req, res) => {
  const { customerId } = req.body;

  if (!customerId) {
    return res
      .status(400)
      .json({ message: "Customer ID is required", success: false });
  }

  const items = await SavedItem.find({ customerId })
    .populate("vendorId")
    .populate("productId")
    .sort({ createdAt: -1 });

  if (!items || items.length === 0) {
    return res.status(404).json({
      message: "No saved items found for the customer",
      success: false,
    });
  }

  const data = await Promise.all(
    items.map(async (item) => {
      let yearDifference;

      if (item.vendorId?.establishment?.year) {
        const establishmentYear = item.vendorId.establishment.year || 0;

        if (establishmentYear > 0) {
          const currentYear = new Date().getFullYear();
          yearDifference = currentYear - establishmentYear;
        }
      }

      const enquiry = await Enquiry.find({ productId: item.productId });

      //   let productResImages = [];

      //   if (item.productId.productImage && item.productId.productImage.length > 0) {
      //     item.productId.productImage = item.productId.productImage.map((image) => {
      //       return productResImages.push(
      //         `${process.env.APP_BASE_URL}/uploads/images/product/${image}`
      //       );
      //     });
      //     item.productId.productImage = productResImages;
      //   }

      return {
        _id: item?._id,
        customerId: item?.customerId,
        productId: item?.productId?._id,
        name: item?.productId?.productName,
        image: `${process.env.APP_BASE_URL}/uploads/images/product/${item?.productId?.productImage[0]}`,
        price: item?.productId?.singlePrice?.price,
        city: item?.vendorId?.locationDetails?.city,
        vendorId: item?.vendorId?._id,
        vendorName: item?.vendorId?.name,
        description: item?.productId?.description,
        mobile: item?.vendorId?.mobile,
        year: yearDifference,
        verified: true,
        enquiries: enquiry.length || 0,
        isSaved: item?.isSaved,
        isService: item?.productId?.isService,
      };
    })
  );

  return res.status(200).json({ data, success: true });
});

const deleteSaveItem = asyncHandler(async (req, res) => {
  const { productId, customerId } = req.body;

  if (!productId) {
    return res
      .status(400)
      .json({ message: "Product ID is required", success: false });
  }
  if (!customerId) {
    return res
      .status(400)
      .json({ message: "Customer ID is required", success: false });
  }

  const saveItem = await SavedItem.findOneAndDelete({ productId, customerId });

  if (!saveItem) {
    return res
      .status(404)
      .json({ message: "Error while deleting saved item!", success: false });
  }

  res.status(200).json({ message: "Item deleted successfully", success: true });
});

module.exports = { saveItem, getSavedItems, deleteSaveItem };
