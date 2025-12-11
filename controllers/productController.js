const asyncHandler = require("express-async-handler");
const excelToJson = require("convert-excel-to-json");
const fs = require("fs-extra");
const ExcelJS = require("exceljs");
const Category = require("../models/categoryModel");
const Vendor = require("../models/vendorModel");
const SubCategory = require("../models/subCategoryModel");
const Product = require("../models/productModel");
const Enquiry = require("../models/enquiryModel");
const SavedItem = require("../models/savedItemsModel");

// @desc Create a new product
// @route POST /api/product
// const createProduct = asyncHandler(async (req, res) => {
//   let data = req.body;

//   console.log(req.body);
//   console.log(req.files);

//   if (!data?.vendorId) {
//     return res
//       .status(400)
//       .json({ message: "Please provide the Vendor ID.", success: false });
//   }

//   const vendorExists = await Vendor.findById(data?.vendorId);

//   if (!vendorExists) {
//     return res
//       .status(400)
//       .json({ message: "Vendor does not exists!", success: false });
//   }

//   const categoryExists = await Category.findById(data?.categoryId);

//   if (!categoryExists) {
//     return res
//       .status(400)
//       .json({ message: "Category does not exists!", success: false });
//   }

//   if (!data?.subCategoryId) {
//     return res
//       .status(400)
//       .json({ message: "Please provide the sub category ID.", success: false });
//   }

//   const subCategoryExists = await SubCategory.findById(data?.subCategoryId);

//   if (!subCategoryExists) {
//     return res
//       .status(400)
//       .json({ message: "Product does not exists!", success: false });
//   }

//   if (!data?.productName) {
//     return res
//       .status(400)
//       .json({ message: "Please provide the product name.", success: false });
//   }

//   let productImages = [];
//   let productResImages = [];

//   if (req.files && req.files.length > 0) {
//     productImages = req.files.map((file) => {
//       const filenameWithoutSpaces = file.filename.replace(/\s+/g, "");
//       productResImages.push(
//         `${process.env.APP_BASE_URL}/uploads/${filenameWithoutSpaces}`
//       );
//       return filenameWithoutSpaces;
//     });
//     data.productImage = productImages;
//   }

//   const product = await Product.create(data);

//   if (product) {
//     if (data.productImage && data.productImage.length > 0) {
//       product.productImage = productResImages;
//     }

//     return res.status(201).json({
//       data: product,
//       success: true,
//     });
//   } else {
//     return res
//       .status(500)
//       .json({ message: "Product creation failed.", success: false });
//   }
// });
const createProduct = asyncHandler(async (req, res) => {
  let data = req.body;

  if (!data?.vendorId) {
    return res
      .status(400)
      .json({ message: "Please provide the Vendor ID.", success: false });
  }

  const vendorExists = await Vendor.findById(data?.vendorId);

  if (!vendorExists) {
    return res
      .status(400)
      .json({ message: "Vendor does not exist!", success: false });
  }

  const categoryExists = await Category.findById(data?.categoryId);

  if (!categoryExists) {
    return res
      .status(400)
      .json({ message: "Category does not exist!", success: false });
  }

  if (!data?.subCategoryId) {
    return res
      .status(400)
      .json({ message: "Please provide the sub category ID.", success: false });
  }

  const subCategoryExists = await SubCategory.findById(data?.subCategoryId);

  if (!subCategoryExists) {
    return res
      .status(400)
      .json({ message: "Sub Category does not exist!", success: false });
  }

  if (!data?.productName) {
    return res
      .status(400)
      .json({ message: "Please provide the product name.", success: false });
  }

  let productImages = [];
  let attachmentImages = [];

  // Check if product images were uploaded
  if (req.files && Object.keys(req.files).length > 0) {
    Object.values(req.files).forEach((files) => {
      files.forEach((file) => {
        const filenameWithoutSpaces = file.filename.replace(/\s+/g, "");
        if (file.fieldname === "productImage") {
          productImages.push(filenameWithoutSpaces);
        } else if (file.fieldname === "attachment") {
          attachmentImages.push(filenameWithoutSpaces);
        }
      });
    });
  }

  console.log("Product Images:", productImages);

  if (!data.productImage) {
    data.productImage = [];
  }
  data.productImage.push(...productImages);
  data.attachment = attachmentImages;

  const product = await Product.create(data);

  if (product) {
    // Now, construct the URLs for frontend response
    const productImageURLs = productImages.map(
      (filename) =>
        `${process.env.APP_BASE_URL}/uploads/images/product/${filename}`
    );
    const attachmentImageURLs = attachmentImages.map(
      (filename) =>
        `${process.env.APP_BASE_URL}/uploads/images/product/${filename}`
    );

    return res.status(201).json({
      data: {
        ...product.toObject(), // Convert Mongoose document to plain JavaScript object
        productImage: productImageURLs,
        attachment: attachmentImageURLs,
      },
      success: true,
    });
  } else {
    return res
      .status(500)
      .json({ message: "Product creation failed.", success: false });
  }
});

// @desc Get product
// @route GET /api/product/:id
const getProduct = asyncHandler(async (req, res) => {
  const productId = req?.params?.id;

  if (!productId) {
    return res
      .status(500)
      .json({ message: "Please provide the product ID.", success: false });
  }

  let product = await Product.findById(productId)
    .populate({
      path: "vendorId",
      select: "name",
    })
    .populate({
      path: "categoryId",
      select: "categoryName",
    })
    .populate({
      path: "subCategoryId",
      select: "subCategoryName",
    });

  if (!product) {
    return res
      .status(500)
      .json({ message: "Product Not Found!", success: false });
  }

  if (product.productImage && product.productImage.length > 0) {
    const basePath = `${process.env.APP_BASE_URL}/uploads/images/product/`;
    product.productImage = product.productImage.map((image) => {
      // ✅ Prepend base URL if needed
      if (
        image &&
        typeof image === "string" &&
        !image.startsWith("http")
      ) {
        image = `${basePath}${image}`;
        console.log("image -->", image);
      }
      return image;
    });
  }

  // Restructure the product data
  let data = {
    ...product._doc,
    vendorId: product?.vendorId?._id,
    vendorName: product?.vendorId?.name,
    categoryId: product?.categoryId?._id,
    categoryName: product?.categoryId?.categoryName,
    subCategoryId: product?.subCategoryId?._id,
    subCategoryName: product?.subCategoryId?.subCategoryName,
  };

  res.status(200).json({
    data,
    success: true,
  });
});

// @desc Get all products
// @route GET /api/product/all
const getAllProducts = asyncHandler(async (req, res) => {
  let { isService } = req.query;

  if (!isService) {
    isService = false;
  }
  const products = await Product.find({ isService: isService })
    .populate({
      path: "vendorId",
      select: "name",
    })
    .populate({
      path: "categoryId",
      select: "categoryName",
    })
    .populate({
      path: "subCategoryId",
      select: "subCategoryName",
    });

  if (!products || products.length === 0) {
    return res.status(500).send(false);
  }

  const result = products.map((product) => {
    let productResImages = [];

    if (product.productImage && product.productImage.length > 0) {
      product.productImage = product.productImage.map((image) => {
        return productResImages.push(
          `${process.env.APP_BASE_URL}/uploads/images/product/${image}`
        );
      });
      product.productImage = productResImages;
    }

    return {
      vendorId: product?.vendorId?._id._id,
      vendorName: product?.vendorId?.name,
      categoryId: product?.categoryId?._id,
      categoryName: product?.categoryId?.categoryName,
      subCategoryId: product?.subCategoryId?._id,
      subCategoryName: product?.subCategoryId?.subCategoryName,
      ...product._doc,
    };
  });

  return res
    .status(200)
    .json({ data: result, count: products.length, success: true });
});

// @desc Update Product
// @route PUT /api/product/:id
const updateProduct = asyncHandler(async (req, res) => {
  const productId = req?.params?.id;
  if (!productId) {
    return res
      .status(400)
      .json({ message: "Please provide the product ID.", success: false });
  }

  const productExists = await Product.findById(productId);

  if (!productExists) {
    res.status(404).json({ message: "Product not found!", success: false });
  }
  let data = req?.body;

  let productImages = [];
  let productResImages = [];
  if (req.files && req.files.length > 0) {
    productImages = req.files.map((file) => {
      const filenameWithoutSpaces = file.filename.replace(/\s+/g, "");
      productResImages.push(
        `${process.env.APP_BASE_URL}/uploads/images/product/${filenameWithoutSpaces}`
      );
      return filenameWithoutSpaces;
    });
  }
  productImages = Object.keys(productExists.productImage || {}).length !== 0 ?[...productImages, ...productExists.productImage]: productImages;
   if (!data.productImage) {
    data.productImage = [];
  }
    data.productImage.push(...productImages);
  let product = await Product.findByIdAndUpdate(productId, data, {
    new: true,
  })
    .populate({
      path: "vendorId",
      select: "name",
    })
    .populate({
      path: "categoryId",
      select: "categoryName",
    })
    .populate({
      path: "subCategoryId",
      select: "subCategoryName",
    });

  if (!product) {
    return res
      .status(500)
      .json({ message: "Error while updating product!", success: false });
  }

  if (data.productImage && data.productImage.length > 0) {
    product.productImage = productResImages;
  }

  let result = {
    ...product._doc,
    vendorId: product?.vendorId?._id,
    vendorName: product?.vendorId?.name,
    categoryId: product?.categoryId?._id,
    categoryName: product?.categoryId?.categoryName,
    subCategoryId: product?.subCategoryId?._id,
    subCategoryName: product?.subCategoryId?.subCategoryName,
  };

  res.status(200).json({
    data: result,
    message: "Product Updated Successfully",
    success: true,
  });
});

// Get Particular Vendor Products
// /api/product/vendor?id=
// const getVendorProducts = asyncHandler(async (req, res) => {
//   const id = req?.query.id;
//   let isService = req?.query.isService;

//   if (!isService) {
//     isService = false;
//   }

//   const products = await Product.find({ vendorId: id, isService: isService })
//     .populate({
//       path: "vendorId",
//       select: "name",
//     })
//     .populate({
//       path: "categoryId",
//       select: "categoryName",
//     })
//     .populate({
//       path: "subCategoryId",
//       select: "subCategoryName",
//     })
//     .sort({ createdAt: -1 });

//   if (!products || products.length === 0) {
//     return res
//       .status(404)
//       .json({ message: "No Products Found!", success: false });
//   }

//   const result = products.map((product) => {
//     let productResImages = [];

//     if (product.productImage && product.productImage.length > 0) {
//       product.productImage = product.productImage.map((image) => {
//         return productResImages.push(
//           `${process.env.APP_BASE_URL}/uploads/images/product/${image}`
//         );
//       });
//       product.productImage = productResImages;
//     }

//     return {
//       ...product._doc,
//       vendorId: product?.vendorId ? product?.vendorId?._id : "",
//       vendorName: product?.vendorId ? product?.vendorId?.name : "",
//       categoryId: product?.categoryId?._id,
//       categoryName: product?.categoryId?.categoryName,
//       subCategoryId: product?.subCategoryId?._id,
//       subCategoryName: product?.subCategoryId?.subCategoryName,
//     };
//   });

//   res.status(200).json({ data: result, success: true });
// });

const getVendorProducts = asyncHandler(async (req, res) => {
  const id = req?.query.id;
  let isService = req?.query.isService || false;

  const products = await Product.find({ vendorId: id, isService: isService })
    .populate({ path: "vendorId", select: "name" })
    .populate({ path: "categoryId", select: "categoryName" })
    .populate({ path: "subCategoryId", select: "subCategoryName" })
    .sort({ createdAt: -1 });

  if (!products || products.length === 0) {
    return res
      .status(404)
      .json({ message: "No Products Found!", success: false });
  }

  const result = products.map((product) => {
    // Prepend full URLs to product images
    const productResImages = (product.productImage || []).map(
      (image) =>
        `${process.env.APP_BASE_URL}/uploads/images/product/${image}`
    );

    return {
      ...product._doc,
      productImage: productResImages,
      vendorId: product?.vendorId?._id || "",
      vendorName: product?.vendorId?.name || "",
      categoryId: product?.categoryId?._id || "",
      categoryName: product?.categoryId?.categoryName || "",
      subCategoryId: product?.subCategoryId?._id || "",
      subCategoryName: product?.subCategoryId?.subCategoryName || "",
    };
  });

  res.status(200).json({ data: result, success: true });
});

// Get Particular Vendor Products by vendorId OR CategoryId
// /api/product?
const getProductsBasedOnVendorOrCategory = asyncHandler(async (req, res) => {
  const { catId, vendorId, subCatId, customerId, isService, searchProductName, page, limit } = req.query;
  let query = {};

  if (vendorId) {
    query.vendorId = vendorId;
  }

  if (catId) {
    query.categoryId = catId;
  }

  if (subCatId) {
    query.subCategoryId = subCatId;
  }
  if (isService) {
    query.isService = isService;
  }
  if (searchProductName) {
    query.productName = { $regex: searchProductName, $options: "i" };
  }

  // Determine if pagination should be applied (only when both page and limit are provided)
  const shouldPaginate = page !== undefined && limit !== undefined;
  const pageNumber = shouldPaginate ? Math.max(parseInt(page, 10) || 1, 1) : 1;
  const pageSize = shouldPaginate ? Math.max(parseInt(limit, 10) || 10, 1) : 0; // unused when !shouldPaginate
  const skip = shouldPaginate ? (pageNumber - 1) * pageSize : 0;

  try {
    let totalItems = 0;
    let products = [];

    if (shouldPaginate) {
      [totalItems, products] = await Promise.all([
        Product.countDocuments(query),
        Product.find(query)
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(pageSize)
          .populate("vendorId"),
      ]);
    } else {
      products = await Product.find(query).sort({ updatedAt: -1 }).populate("vendorId");
    }

    if (!products || products.length === 0) {
      return res.status(200).json({ data: [], pagination: { page: pageNumber, limit: pageSize, totalPages: 0, totalItems: 0 }, success: true });
    }

    const transformedProducts = await Promise.all(
      products.map(async (product) => {
        let isSaved = false;

        if (customerId) {
          const saveItem = await SavedItem.findOne({
            customerId,
            productId: product._id,
          });

          if (saveItem) {
            isSaved = saveItem.isSaved;
          }
        }

        let yearDifference;
        if (product?.vendorId?.establishment?.year) {
          const establishmentYear = product?.vendorId?.establishment?.year || 0;

          if (establishmentYear > 0) {
            const currentYear = new Date().getFullYear();
            yearDifference = currentYear - establishmentYear;
          }
        }

        const enquiryCount = await Enquiry.countDocuments({
          productId: product._id,
          vendorId: product.vendorId?._id,
        });

        return {
          _id: product?._id,
          name: product?.productName || "",
          image: `${process.env.APP_BASE_URL}/uploads/images/product/${product.productImage[0]}`,
          price: product?.singlePrice?.price || 0,
          vendorId: product?.vendorId?._id || "",
          vendorName: product?.vendorId?.businessDetails?.businessName || "",
          locationDetails: product?.vendorId?.locationDetails,
          isSubscribed: product?.vendorId?.isPayment || false,
          mobile: product?.vendorId?.mobile || "",
          year: yearDifference || 0,
          manufacturer: product.manufacturer,
          verified: true,
          enquiries: enquiryCount || 0,
          isSaved: isSaved,
          isService: product?.isService,
        };
      })
    );

    if (!shouldPaginate) {
      return res.status(200).send({ data: transformedProducts, success: true });
    }

    const totalPages = Math.ceil(totalItems / pageSize);

    return res.status(200).send({
      data: transformedProducts,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        totalPages,
        totalItems,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
      },
      success: true,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal Server Error", success: false });
  }
});

// @desc Delete Product
// @route DELETE /api/product/:id
const deleteProduct = asyncHandler(async (req, res) => {
  const productId = req?.params?.id;

  if (!productId) {
    return res
      .status(400)
      .json({ message: "Please provide the product ID.", success: false });
  }

  const product = await Product.findById(productId);

  if (!product) {
    return res
      .status(404)
      .json({ message: "Product Not Found!", success: false });
  }

  await Product.deleteOne({ _id: productId });

  res.status(200).json({ success: true });
});

const bulkUpload = asyncHandler(async (req, res) => {
  if (!req?.file) {
    return res.json({ message: "No File Found!", success: false });
  } else {
    const filenameWithoutSpaces =
      "uploads/files/product/" + req.file.filename.replace(/\s+/g, "");

    const excelData = excelToJson({
      sourceFile: filenameWithoutSpaces,
      header: {
        rows: 1,
      },
      columnToKey: {
        "*": "{{columnHeader}}",
      },
    });

    fs.remove(filenameWithoutSpaces);

    const excelSheetName = Object.keys(excelData)[0];

    const data = excelData[excelSheetName];

    // Only consider rows where vendorId, categoryId, and subCategoryId are non-empty
    const filteredData = (data || []).filter((row) => {
      const hasValue = (v) => v !== undefined && v !== null && String(v).trim() !== "";
      return hasValue(row.vendorId) && hasValue(row.categoryId) && hasValue(row.subCategoryId);
    });

    if (!filteredData.length) {
      return res
        .status(400)
        .json({ message: "No valid rows to upload (missing IDs).", success: false });
    }

    // Transform data to match product schema structure
    const transformedData = filteredData.map((row) => {
      const product = {
        vendorId: row.vendorId,
        categoryId: row.categoryId,
        subCategoryId: row.subCategoryId,
        productName: row.productName,
      };

      // Parse productImage (comma-separated string to array)
      if (row.productImage) {
        const images = String(row.productImage)
          .split(",")
          .map((img) => img.trim())
          .filter((img) => img !== "");
        product.productImage = images.length > 0 ? images : [];
      } else {
        product.productImage = [];
      }

      // Parse singlePrice object
      product.singlePrice = {
        price: row.singlePrice_price ? parseFloat(row.singlePrice_price) : null,
        unit: row.singlePrice_unit ? String(row.singlePrice_unit).trim() : "",
        minOrderQty: row.singlePrice_minOrderQty ? parseFloat(row.singlePrice_minOrderQty) : null,
        minOrderQtyUnit: row.singlePrice_minOrderQtyUnit ? String(row.singlePrice_minOrderQtyUnit).trim() : "",
      };

      // Parse priceRange object
      product.priceRange = {
        min: row.priceRange_min && String(row.priceRange_min).trim() !== "" ? parseFloat(row.priceRange_min) : null,
        max: row.priceRange_max && String(row.priceRange_max).trim() !== "" ? parseFloat(row.priceRange_max) : null,
        unit: row.priceRange_unit ? String(row.priceRange_unit).trim() : "",
        minOrderQty: row.priceRange_minOrderQty ? parseFloat(row.priceRange_minOrderQty) : null,
        minOrderQtyUnit: row.priceRange_minOrderQtyUnit ? String(row.priceRange_minOrderQtyUnit).trim() : "",
      };

      // Parse specification (JSON string or empty)
      if (row.specification && String(row.specification).trim() !== "") {
        try {
          const spec = JSON.parse(row.specification);
          product.specification = { inputs: Array.isArray(spec.inputs) ? spec.inputs : [] };
        } catch (e) {
          product.specification = { inputs: [] };
        }
      } else {
        product.specification = { inputs: [] };
      }

      // Parse countryOrigin
      product.countryOrigin = row.countryOrigin && String(row.countryOrigin).trim() !== "" ? String(row.countryOrigin).trim() : null;

      // Parse description
      product.description = row.description && String(row.description).trim() !== "" ? String(row.description).trim() : null;

      // Parse sellerSkuId
      product.sellerSkuId = row.sellerSkuId && String(row.sellerSkuId).trim() !== "" ? String(row.sellerSkuId).trim() : null;

      // Parse attachment (comma-separated string to array)
      if (row.attachment) {
        const attachments = String(row.attachment)
          .split(",")
          .map((att) => att.trim())
          .filter((att) => att !== "");
        product.attachment = attachments.length > 0 ? attachments : [];
      } else {
        product.attachment = [];
      }

      // Parse isService (boolean)
      if (row.isService !== undefined && row.isService !== null) {
        const isServiceStr = String(row.isService).trim().toLowerCase();
        product.isService = isServiceStr === "true" || isServiceStr === "1" || isServiceStr === "yes";
      } else {
        product.isService = false;
      }

      return product;
    });

    // Can add checks before adding if vendor, category, subcategory exists
    console.log("transformedData", transformedData);
    const products = await Product.insertMany(transformedData, { ordered: false });

    if (!products || products.length === 0) {
      return res
        .status(400)
        .json({ message: "Error while adding products", success: false });
    }

    res.status(201).json({
      data: products,
      success: true,
      message: "Products Added Successfully.",
    });
  }
});

const getProductDetails = asyncHandler(async (req, res) => {
  const { productId, customerId } = req.query; // Add customerId to the query

  try {
    const product = await Product.findById(productId).populate("vendorId");

    if (!product) {
      return res
        .status(404)
        .json({ message: "Product not found", success: false });
    }

    const enquiry = await Enquiry.find({ productId });

    let yearDifference;
    if (product?.vendorId?.establishment?.year) {
      const establishmentYear = product?.vendorId?.establishment?.year || 0;

      if (establishmentYear > 0) {
        const currentYear = new Date().getFullYear();
        yearDifference = currentYear - establishmentYear;
      }
    }

    let productResImages = [];

    if (product?.productImage && product?.productImage?.length > 0) {
      productResImages = product?.productImage?.map((image) => {
        return `${process.env.APP_BASE_URL}/uploads/images/product/${image}`;
      });
    }

    // Check if the product is saved by the customer
    let isSaved = false;
    if (customerId) {
      const saveItem = await SavedItem.findOne({
        customerId,
        productId: product._id,
      });

      if (saveItem) {
        isSaved = saveItem.isSaved;
      }
    }

    // Total enquiries for this vendor
    const totalEnquiries = await Enquiry.countDocuments({ vendorId: product.vendorId });

    // Count enquiries where vendor has read or closed them
    const respondedEnquiries = await Enquiry.countDocuments({
      vendorId: product.vendorId,
      $or: [{ isRead: true }, { enquiryStatus: "Close" }],
    });

    console.log("Total enquires are ",totalEnquiries, "and responded enquiries are ",respondedEnquiries)

    // Calculate response rate
    let responseRate = "0%";
    if (totalEnquiries > 0) {
      responseRate = `${Math.round((respondedEnquiries / totalEnquiries) * 100)}%`;
    }

    const data = {
      _id: product?._id,
      productName: product?.productName,
      vendorId: product?.vendorId?._id || "",
      vendorName: product?.vendorId.businessDetails?.businessName || "",
      vendorImage: product?.vendorId.profileImage
        ? `${process.env.APP_BASE_URL}/uploads/images/vendor/${product?.vendorId.profileImage}`
        : "",
      isSubscribed: product?.vendorId?.isPayment || false,
      responseRate,
      image: productResImages,
      price: product?.singlePrice?.price ? product?.singlePrice?.price : "",
      city: product?.vendorId?.locationDetails?.city || "",
      description: product?.description ? product?.description : "",
      enquiries: enquiry?.length ? enquiry?.length : 0,
      categoryName: product?.categoryName ? product?.categoryName : "",
      subCategoryName: product?.subCategoryName ? product?.subCategoryName : "",
      priceRange: product?.priceRange ? product?.priceRange : "",
      specification: product?.specification?.inputs
        ? product?.specification?.inputs
        : "",
      priceBasedOnQty: product?.priceBasedOnQty ? product?.priceBasedOnQty : "",
      mobile: product?.vendorId?.mobile ? product?.vendorId?.mobile : "",
      year: yearDifference ? yearDifference : 0,
      manufacturer: product?.manufacturer,
      isSaved: isSaved,
      isService: product?.isService,
    };

    res.status(200).send(data);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal Server Error", success: false });
  }
});

const getProductBestPriceDetail = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  if (!productId) {
    return res
      .status(400)
      .json({ message: "Please provide the product ID.", success: false });
  }

  const product = await Product.findOne({ _id: productId }).populate(
    "vendorId"
  );

  if (!product || product.length === 0) {
    return res
      .status(404)
      .json({ message: "Product Not Found!", success: false });
  }

  let productResImages = [];

  if (product.productImage && product.productImage.length > 0) {
    product.productImage = product.productImage.map((image) => {
      return productResImages.push(
        `${process.env.APP_BASE_URL}/uploads/images/product/${image}`
      );
    });
    product.productImage = productResImages;
  }
  let yearDifference;
  if (product.vendorId.establishment.year) {
    const establishmentYear = product.vendorId.establishment.year;

    // Get the current year
    const currentYear = new Date().getFullYear();

    // Calculate the difference between the current year and establishment year
    yearDifference = currentYear - establishmentYear;
  }

  const enquiryCount = await Enquiry.countDocuments({
    productId: product._id,
    vendorId: product.vendorId._id,
  });

  const data = {
    _id: product._id,
    productName: product?.productName,
    categoryId: product?.catId,
    vendorName: product?.vendorId?.businessDetails?.businessName,
    vendorId: product?.vendorId?._id,
    isSubscribed: product?.vendorId?.isPayment,
    mobile: product?.vendorId?.mobile,
    image: productResImages,
    priceRange: product?.priceRange ? product?.priceRange : "",
    city: product?.vendorId?.locationDetails?.city || "",
    description: product?.description ? product?.description : "",
    year: yearDifference ? yearDifference : 0,
    isService: product?.isService,
    enquiries: enquiryCount || 0,
    unit: [product?.singlePrice?.unit],
  };

  res.status(200).send(data);
});

// @desc Export Excel template for bulk product upload
// @route GET /api/product/bulk/template
const exportBulkTemplate = asyncHandler(async (req, res) => {
  const vendorId = req.query.vendorId;
  
  const [categories, subCategories] = await Promise.all([
    Category.find({}, { _id: 1, categoryName: 1 }).lean(),
    SubCategory.find({}, { _id: 1, subCategoryName: 1 }).lean(),
  ]);

  const workbook = new ExcelJS.Workbook();
  const templateSheet = workbook.addWorksheet("Template");
  const lookupSheet = workbook.addWorksheet("Lookups");

  // Lookup headers
  lookupSheet.getCell("A1").value = "categoryName";
  lookupSheet.getCell("B1").value = "categoryId";
  lookupSheet.getCell("C1").value = "subCategoryName";
  lookupSheet.getCell("D1").value = "subCategoryId";

  let rowIdx = 2;
  categories.forEach((cat) => {
    lookupSheet.getCell(`A${rowIdx}`).value = cat.categoryName || "";
    lookupSheet.getCell(`B${rowIdx}`).value = String(cat._id);
    rowIdx += 1;
  });

  let subRowIdx = 2;
  subCategories.forEach((sub) => {
    lookupSheet.getCell(`C${subRowIdx}`).value = sub.subCategoryName || "";
    lookupSheet.getCell(`D${subRowIdx}`).value = String(sub._id);
    subRowIdx += 1;
  });

  // Hide lookup sheet
  lookupSheet.state = "veryHidden";

  // Template columns: include hidden name columns for dropdowns
  templateSheet.columns = [
    { header: "productName", key: "productName", width: 30 },
    { header: "categoryName", key: "categoryName", width: 30 },
    { header: "categoryId", key: "categoryId", width: 36 },
    { header: "subCategoryName", key: "subCategoryName", width: 30 },
    { header: "subCategoryId", key: "subCategoryId", width: 36 },
    { header: "vendorId", key: "vendorId", width: 30 },
    { header: "productImage", key: "productImage", width: 40 },
    { header: "singlePrice_price", key: "singlePrice_price", width: 20 },
    { header: "singlePrice_unit", key: "singlePrice_unit", width: 15 },
    { header: "singlePrice_minOrderQty", key: "singlePrice_minOrderQty", width: 20 },
    { header: "singlePrice_minOrderQtyUnit", key: "singlePrice_minOrderQtyUnit", width: 20 },
    { header: "priceRange_min", key: "priceRange_min", width: 20 },
    { header: "priceRange_max", key: "priceRange_max", width: 20 },
    { header: "priceRange_unit", key: "priceRange_unit", width: 15 },
    { header: "priceRange_minOrderQty", key: "priceRange_minOrderQty", width: 20 },
    { header: "priceRange_minOrderQtyUnit", key: "priceRange_minOrderQtyUnit", width: 20 },
    { header: "specification", key: "specification", width: 50 },
    { header: "countryOrigin", key: "countryOrigin", width: 20 },
    { header: "description", key: "description", width: 40 },
    { header: "sellerSkuId", key: "sellerSkuId", width: 25 },
    { header: "attachment", key: "attachment", width: 40 },
    { header: "isService", key: "isService", width: 15 },
  ];

  // Hide helper columns where user selects names
  templateSheet.getColumn(3).hidden = true;
  templateSheet.getColumn(5).hidden = true;
  templateSheet.getColumn(6).hidden = true;

  // Style header
  const headerRow = templateSheet.getRow(1);
  headerRow.font = { bold: true };

  // Instruction row
  const noteRow = templateSheet.addRow([
    "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""
  ]);
  noteRow.getCell(1).value = "Note: productName, categoryId, subCategoryId, vendorId are mandatory. " +
    "productImage and attachment: comma-separated values. " +
    "specification: JSON format e.g., {\"inputs\":[]}. " +
    "isService: true/false/1/0/yes/no. " +
    "Empty values for priceRange min/max will be set to null.";
  noteRow.getCell(1).font = { italic: true, color: { argb: "FF555555" } };
  noteRow.getCell(1).alignment = { wrapText: true, vertical: "top" };
  // Merge instruction cell across all columns
  templateSheet.mergeCells(`A2:V2`);
  noteRow.height = 40;
  templateSheet.getRow(1).height = 20;

  // First data row with validations and formulas
  const dataRowIndex = 3;
  const categoryListStart = 2;
  const categoryListEnd = categories.length + 1;
  const subListStart = 2;
  const subListEnd = subCategories.length + 1;

  // Data validation for categoryName (hidden col B)
  templateSheet.getCell(`B${dataRowIndex}`).dataValidation = {
    type: "list",
    allowBlank: true,
    formulae: [`Lookups!$A$${categoryListStart}:$A$${categoryListEnd}`],
    showErrorMessage: true,
    errorStyle: "warning",
    error: "Please select a valid category name",
    prompt: "Select a category by name",
    showInputMessage: true,
  };

  // VLOOKUP for categoryId (col C)
  templateSheet.getCell(`C${dataRowIndex}`).value = {
    formula: `IFERROR(VLOOKUP(B${dataRowIndex},Lookups!$A$${categoryListStart}:$B$${categoryListEnd},2,FALSE),"")`,
  };

  // Data validation for subCategoryName (hidden col D)
  templateSheet.getCell(`D${dataRowIndex}`).dataValidation = {
    type: "list",
    allowBlank: true,
    formulae: [`Lookups!$C$${subListStart}:$C$${subListEnd}`],
    showErrorMessage: true,
    errorStyle: "warning",
    error: "Please select a valid sub category name",
    prompt: "Select a sub category by name",
    showInputMessage: true,
  };

  // VLOOKUP for subCategoryId (col E)
  templateSheet.getCell(`E${dataRowIndex}`).value = {
    formula: `IFERROR(VLOOKUP(D${dataRowIndex},Lookups!$C$${subListStart}:$D$${subListEnd},2,FALSE),"")`,
  };

  // Populate vendorId if provided in query parameter (col F)
  if (vendorId) {
    templateSheet.getCell(`F${dataRowIndex}`).value = vendorId;
  }

  // Freeze header and instruction rows
  templateSheet.views = [{ state: "frozen", ySplit: 2 }];

  // Response headers for file download
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=bulk_product_template.xlsx"
  );

  await workbook.xlsx.write(res);
  res.end();
});

module.exports = {
  createProduct,
  getProduct,
  getAllProducts,
  getVendorProducts,
  updateProduct,
  deleteProduct,
  bulkUpload,
  getProductsBasedOnVendorOrCategory,
  getProductDetails,
  getProductBestPriceDetail,
  exportBulkTemplate,
};
