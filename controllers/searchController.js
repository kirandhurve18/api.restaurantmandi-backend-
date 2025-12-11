const asyncHandler = require("express-async-handler");
const Product = require("../models/productModel");
const Enquiry = require("../models/enquiryModel");
const Review = require("../models/reviewModel");
const SavedItem = require("../models/savedItemsModel");

const searchProduct = asyncHandler(async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res
      .status(400)
      .json({ message: "Please enter a query", success: false });
  }

  const products = await Product.aggregate([
    {
      $lookup: {
        from: "vendors",
        localField: "vendorId",
        foreignField: "_id",
        as: "vendor",
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "categoryId",
        foreignField: "_id",
        as: "category",
      },
    },
    {
      $lookup: {
        from: "sub_categories",
        localField: "subCategoryId",
        foreignField: "_id",
        as: "subcategory",
      },
    },
    {
      $unwind: "$vendor",
    },
    {
      $unwind: "$category",
    },
    {
      $unwind: "$subcategory",
    },
    {
      $match: {
        $or: [
          { "vendor.name": { $regex: query, $options: "i" } },
          { "category.categoryName": { $regex: query, $options: "i" } },
          { "subcategory.subCategoryName": { $regex: query, $options: "i" } },
          { productName: { $regex: query, $options: "i" } },
        ],
      },
    },
    {
      $project: {
        _id: 1,
        productName: 1,
        productImage: 1,
        vendorName: "$vendor.name",
        categoryName: "$category.categoryName",
        subCategoryName: "$subcategory.subCategoryName",
        price: 1,
        description: 1,
        // Add other fields you want to return
      },
    },
  ]);

  if (!products || products.length === 0) {
    return res
      .status(404)
      .json({ message: "No products found!", success: false });
  }

  res.status(200).json({ data: products, success: true });
});

// Search for mobile app
// const searchProductForMobile = asyncHandler(async (req, res) => {
//   const query = req.query.q;

//   if (!query)
//     return res
//       .status(400)
//       .json({ message: "Please enter a query", success: false });

//   const products = await Product.aggregate([
//     {
//       $lookup: {
//         from: "vendors",
//         localField: "vendorId",
//         foreignField: "_id",
//         as: "vendor",
//       },
//     },
//     {
//       $lookup: {
//         from: "categories",
//         localField: "categoryId",
//         foreignField: "_id",
//         as: "category",
//       },
//     },
//     {
//       $lookup: {
//         from: "sub_categories",
//         localField: "subCategoryId",
//         foreignField: "_id",
//         as: "subcategory",
//       },
//     },
//     {
//       $unwind: "$vendor",
//     },
//     {
//       $unwind: "$category",
//     },
//     {
//       $unwind: "$subcategory",
//     },
//     {
//       $match: {
//         $or: [
//           { "vendor.name": { $regex: query, $options: "i" } },
//           { "category.categoryName": { $regex: query, $options: "i" } },
//           { "subcategory.subCategoryName": { $regex: query, $options: "i" } },
//           { productName: { $regex: query, $options: "i" } },
//         ],
//       },
//     },
//     {
//       $project: {
//         _id: 1,
//         productName: 1,
//         productImage: 1,
//         vendorId: "$vendor._id",
//         vendorName: "$vendor.name",
//         vendorMobile: "$vendor.mobile",
//         vendorEstablishmentYear: "$vendor.establishment.year",
//         catId: "$category._id",
//         categoryName: "$category.categoryName",
//         subCategoryName: "$subcategory.subCategoryName",
//         singlePrice: 1,
//         priceRange: 1,
//         specification: 1,
//         priceBasedOnQty: 1,
//         city: 1,
//         description: 1,
//       },
//     },
//   ]);

//   if (!products || products.length === 0) {
//     return res
//       .status(404)
//       .json({ message: "No Products Found!", success: false });
//   }

//   const data = await Promise.all(
//     products.map(async (product) => {
//       const enquiry = await Enquiry.find({ productId: product._id });

//       // Calculate the year difference
//       const currentYear = new Date().getFullYear();
//       const yearDifference = product.vendorEstablishmentYear
//         ? currentYear - product.vendorEstablishmentYear
//         : 0;

//       // Process product images
//       const productResImages = product.productImage.map(
//         (image) =>
//           `${process.env.APP_BASE_URL}/uploads/images/product/${image}`
//       );

//       return {
//         _id: product._id,
//         name: product.productName,
//         image: productResImages[0],
//         price: parseInt(product.singlePrice.price)
//           ? parseInt(product.singlePrice.price)
//           : 0,
//         city: product.city ? product.city : "",
//         vendorId: product.vendorId,
//         vendorName: product.vendorName,
//         mobile: product.vendorMobile,
//         year: yearDifference,
//         verified: true,
//         enquiries: enquiry.length ? enquiry.length : 0,
//         isService: product.isService ? product.isService : false,
//       };
//     })
//   );

//   res.status(200).send(data);
// });
// const searchProductForMobile = asyncHandler(async (req, res) => {
//   const { q: query, subCategoryId, categoryId } = req.query;

//   if (!query) {
//     return res
//       .status(400)
//       .json({ message: "Please enter a query", success: false });
//   }

//   const pipeline = [
//     {
//       $lookup: {
//         from: "vendors",
//         localField: "vendorId",
//         foreignField: "_id",
//         as: "vendor",
//       },
//     },
//     {
//       $lookup: {
//         from: "categories",
//         localField: "categoryId",
//         foreignField: "_id",
//         as: "category",
//       },
//     },
//     {
//       $lookup: {
//         from: "sub_categories",
//         localField: "subCategoryId",
//         foreignField: "_id",
//         as: "subcategory",
//       },
//     },
//     {
//       $unwind: "$vendor",
//     },
//     {
//       $unwind: "$category",
//     },
//     {
//       $unwind: "$subcategory",
//     },
//     {
//       $match: {
//         $or: [
//           { "vendor.name": { $regex: query, $options: "i" } },
//           { "category.categoryName": { $regex: query, $options: "i" } },
//           { "subcategory.subCategoryName": { $regex: query, $options: "i" } },
//           { productName: { $regex: query, $options: "i" } },
//         ],
//       },
//     },
//     {
//       $project: {
//         _id: 1,
//         productName: 1,
//         productImage: 1,
//         vendorId: "$vendor._id",
//         vendorName: "$vendor.name",
//         vendorMobile: "$vendor.mobile",
//         vendorEstablishmentYear: "$vendor.establishment.year",
//         catId: "$category._id",
//         categoryName: "$category.categoryName",
//         subCategoryId: "$subcategory._id",
//         subCategoryName: "$subcategory.subCategoryName",
//         singlePrice: 1,
//         priceRange: 1,
//         specification: 1,
//         priceBasedOnQty: 1,
//         city: 1,
//         description: 1,
//       },
//     },
//   ];

//   const products = await Product.aggregate(pipeline);

//   if (!products || products.length === 0) {
//     return res
//       .status(404)
//       .json({ message: "No Products Found!", success: false });
//   }

//   // Filter products based on subCategoryId if provided
//   let filteredProducts = products;
//   if (subCategoryId) {
//     console.log(subCategoryId);
//     filteredProducts = products.filter(
//       (product) => product.subCategoryId.toString() === subCategoryId
//     );
//   } else if (categoryId) {
//     filteredProducts = products.filter(
//       (product) => product.catId.toString() === categoryId
//     );
//   }

//   const data = await Promise.all(
//     filteredProducts.map(async (product) => {
//       const enquiry = await Enquiry.find({ productId: product._id });

//       // Calculate the year difference
//       const currentYear = new Date().getFullYear();
//       const yearDifference = product.vendorEstablishmentYear
//         ? currentYear - product.vendorEstablishmentYear
//         : 0;

//       // Process product images
//       const productResImages = product.productImage.map(
//         (image) =>
//           `${process.env.APP_BASE_URL}/uploads/images/product/${image}`
//       );

//       return {
//         _id: product._id,
//         name: product.productName,
//         image: productResImages[0],
//         price: parseInt(product.singlePrice.price)
//           ? parseInt(product.singlePrice.price)
//           : 0,
//         city: product.city ? product.city : "",
//         vendorId: product.vendorId,
//         vendorName: product.vendorName,
//         categoryName: product.categoryName,
//         mobile: product.vendorMobile,
//         year: yearDifference,
//         verified: true,
//         enquiries: enquiry.length ? enquiry.length : 0,
//         isService: product.isService ? product.isService : false,
//       };
//     })
//   );

//   res.status(200).send(data);
// });

const searchProductForMobile = asyncHandler(async (req, res) => {
  const query = req.query.q;

  if (!query)
    return res
      .status(400)
      .json({ message: "Please enter a query", success: false });

  const products = await Product.aggregate([
    {
      $lookup: {
        from: "vendors",
        localField: "vendorId",
        foreignField: "_id",
        as: "vendor",
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "categoryId",
        foreignField: "_id",
        as: "category",
      },
    },
    {
      $lookup: {
        from: "sub_categories",
        localField: "subCategoryId",
        foreignField: "_id",
        as: "subcategory",
      },
    },
    {
      $unwind: "$vendor",
    },
    {
      $unwind: "$category",
    },
    {
      $unwind: "$subcategory",
    },
    {
      $match: {
        $or: [
          { "vendor.name": { $regex: query, $options: "i" } },
          { "category.categoryName": { $regex: query, $options: "i" } },
          { "subcategory.subCategoryName": { $regex: query, $options: "i" } },
          { productName: { $regex: query, $options: "i" } },
        ],
      },
    },
    {
      $project: {
        _id: 1,
        productName: 1,
        productImage: 1,
        vendorName: "$vendor.name",
        vendorMobile: "$vendor.mobile",
        locationDetails: "$vendor.locationDetails",
        vendorEstablishmentYear: "$vendor.establishment.year",
        catId: "$category._id",
        categoryName: "$category.categoryName",
        subCategoryName: "$subcategory.subCategoryName",
        singlePrice: 1,
        priceRange: 1,
        specification: 1,
        priceBasedOnQty: 1,
        city: 1,
        description: 1,
      },
    },
  ]);

  if (!products || products.length === 0) {
    return res
      .status(404)
      .json({ message: "No Products Found!", success: false });
  }

  const data = await Promise.all(
    products.map(async (product) => {
      const enquiry = await Enquiry.find({ productId: product._id });

      // Calculate the year difference
      const currentYear = new Date().getFullYear();
      const yearDifference = product.vendorEstablishmentYear
        ? currentYear - product.vendorEstablishmentYear
        : 0;

      // Process product images
      const productResImages = product.productImage.map(
        (image) =>
          `${process.env.APP_BASE_URL}/uploads/images/product/${image}`
      );

      return {
        _id: product._id,
        productName: product.productName,
        vendorName: product.vendorName,
        vendorMobile: product.vendorMobile,
        locationDetails: product.locationDetails,
        catId: product.catId,
        year: yearDifference,
        image: productResImages,
        price: product?.singlePrice
          ? product?.singlePrice?.price : "",
        city: product.city ? product.city : "",
        description: product.description ? product.description : "",
        enquiries: enquiry.length ? enquiry.length : 0,
        categoryName: product.categoryName ? product.categoryName : "",
        subCategoryName: product.subCategoryName ? product.subCategoryName : "",
        priceRange: product?.priceRange ? product?.priceRange : "",
        specification: product.specification.inputs
          ? product.specification.inputs
          : "",
        priceBasedOnQty: product?.priceBasedOnQty ? product?.priceBasedOnQty : "",
      };
    })
  );

  res.status(200).send(data);
});

// const filterProducts = asyncHandler(async (req, res) => {
//   const { city, brand, years, price, rating } = req.body;

//   if (!city && !brand && !years && !price && !rating) {
//     return res.status(400).json({
//       message: "Please provide at least one field to filter!",
//       success: false,
//     });
//   }

//   // Construct city and brand regex arrays if provided
//   const cityRegexArray =
//     city && city.length > 0
//       ? city.map((cityName) => new RegExp(cityName, "i"))
//       : [];
//   const vendorNameRegexArray =
//     brand && brand.length > 0 ? brand.map((name) => new RegExp(name, "i")) : [];

//   const matchStage = {};

//   if (cityRegexArray.length > 0) {
//     matchStage.city = { $in: cityRegexArray };
//   }

//   const products = await Product.aggregate([
//     {
//       $match: matchStage,
//     },
//     {
//       $lookup: {
//         from: "vendors",
//         localField: "vendorId",
//         foreignField: "_id",
//         as: "vendor",
//       },
//     },
//     {
//       $unwind: "$vendor",
//     },
//     {
//       $lookup: {
//         from: "categories",
//         localField: "categoryId",
//         foreignField: "_id",
//         as: "category",
//       },
//     },
//     {
//       $unwind: "$category",
//     },
//     {
//       $lookup: {
//         from: "sub_categories",
//         localField: "subCategoryId",
//         foreignField: "_id",
//         as: "subcategory",
//       },
//     },
//     {
//       $unwind: "$subcategory",
//     },
//     {
//       $match:
//         vendorNameRegexArray.length > 0
//           ? { "vendor.name": { $in: vendorNameRegexArray } }
//           : {},
//     },
//     {
//       $project: {
//         _id: 1,
//         productName: 1,
//         productImage: 1,
//         vendorId: "$vendor._id",
//         vendorName: "$vendor.name",
//         vendorMobile: "$vendor.mobile",
//         vendorEstablishmentYear: "$vendor.establishment.year",
//         catId: "$category._id",
//         categoryName: "$category.categoryName",
//         subCategoryName: "$subcategory.subCategoryName",
//         singlePrice: 1,
//         priceRange: 1,
//         specification: 1,
//         priceBasedOnQty: 1,
//         city: 1,
//         description: 1,
//         isService: 1,
//       },
//     },
//   ]);

//   if (!products || products.length === 0) {
//     return res.status(404).json({ message: "No data found!", success: false });
//   }

//   const currentYear = new Date().getFullYear();

//   // Parse years to ranges
//   let yearRanges = [];
//   if (years && years.length > 0) {
//     let minYear = Infinity;
//     let maxYear = -Infinity;

//     years.forEach((year) => {
//       if (typeof year === "string" && year.includes("+")) {
//         const parsedYear = parseInt(year);
//         if (parsedYear < minYear) minYear = parsedYear;
//         if (parsedYear > maxYear) maxYear = parsedYear;
//         yearRanges.push({ min: parsedYear, max: Infinity });
//       } else {
//         const parsedYear = parseInt(year);
//         if (parsedYear < minYear) minYear = parsedYear;
//         if (parsedYear > maxYear) maxYear = parsedYear;
//       }
//     });

//     if (minYear !== Infinity && maxYear !== -Infinity) {
//       yearRanges.push({ min: minYear, max: maxYear });
//     }
//   } else {
//     yearRanges.push({ min: 0, max: Infinity }); // Default to include all years if no years are provided
//   }

//   // Filter products based on parsed year ranges
//   const filteredProducts = products.filter((product) => {
//     const establishmentYear = product.vendorEstablishmentYear;
//     if (!establishmentYear) return false;

//     const yearDifference = currentYear - establishmentYear;

//     // Check if yearDifference falls within any of the specified ranges
//     return yearRanges.some(
//       (range) => yearDifference >= range.min && yearDifference <= range.max
//     );
//   });

//   // Get ratings for each vendor and calculate the average rating
//   const vendorIds = filteredProducts.map((product) => product.vendorId);
//   const reviews = await Review.aggregate([
//     {
//       $match: { vendorId: { $in: vendorIds } },
//     },
//     {
//       $group: {
//         _id: "$vendorId",
//         averageRating: { $avg: "$reviewStar" },
//       },
//     },
//   ]);

//   const reviewMap = new Map();
//   reviews.forEach((review) => {
//     reviewMap.set(review._id.toString(), review.averageRating);
//   });

//   // Add average rating to each product
//   filteredProducts.forEach((product) => {
//     product.averageRating = reviewMap.get(product.vendorId.toString()) || 0;
//   });

//   // Sort the filtered products based on the price and rating
//   const sortedProducts = filteredProducts.sort((a, b) => {
//     if (price === "low" && rating === "high") {
//       if (a.singlePrice.price === b.singlePrice.price) {
//         return b.averageRating - a.averageRating;
//       }
//       return a.singlePrice.price - b.singlePrice.price;
//     } else if (price === "low" && rating === "low") {
//       if (a.singlePrice.price === b.singlePrice.price) {
//         return a.averageRating - b.averageRating;
//       }
//       return a.singlePrice.price - b.singlePrice.price;
//     } else if (price === "high" && rating === "high") {
//       if (b.singlePrice.price === a.singlePrice.price) {
//         return b.averageRating - a.averageRating;
//       }
//       return b.singlePrice.price - a.singlePrice.price;
//     } else if (price === "high" && rating === "low") {
//       if (b.singlePrice.price === a.singlePrice.price) {
//         return a.averageRating - b.averageRating;
//       }
//       return b.singlePrice.price - a.singlePrice.price;
//     } else if (price === "low") {
//       return a.singlePrice.price - b.singlePrice.price;
//     } else if (price === "high") {
//       return b.singlePrice.price - a.singlePrice.price;
//     } else if (rating === "high") {
//       return b.averageRating - a.averageRating;
//     } else if (rating === "low") {
//       return a.averageRating - b.averageRating;
//     }
//     return 0; // Default to no sorting if sort parameter is not provided
//   });

//   const data = await Promise.all(
//     sortedProducts.map(async (product) => {
//       const enquiry = await Enquiry.find({ productId: product._id });

//       // Calculate the year difference
//       const establishmentYear = product.vendorEstablishmentYear;
//       const yearDifference = establishmentYear
//         ? currentYear - establishmentYear
//         : 0;

//       // Process product images
//       const productResImages = product.productImage.map(
//         (image) =>
//           `${process.env.APP_BASE_URL}/uploads/images/product/${image}`
//       );

//       return {
//         _id: product._id,
//         name: product.productName,
//         image: productResImages[0],
//         price: parseInt(product.singlePrice.price)
//           ? parseInt(product.singlePrice.price)
//           : 0,
//         city: product.city ? product.city : "",
//         vendorId: product.vendorId,
//         vendorName: product.vendorName,
//         mobile: product.vendorMobile,
//         year: yearDifference,
//         verified: true,
//         enquiries: enquiry.length ? enquiry.length : 0,
//         isService: product.isService,
//       };
//     })
//   );

//   res.status(200).send(data);
// });

const filterProducts = asyncHandler(async (req, res) => {
  const { city, brand, years, price, rating, subCategoryId, categoryId } =
    req.body;
  const { page, limit } = req.query;
  const { customerId } = req.query;

  if (
    !city &&
    !brand &&
    !years &&
    !price &&
    !rating &&
    !subCategoryId &&
    !categoryId
  ) {
    return res.status(400).json({
      message: "Please provide at least one field to filter!",
      success: false,
    });
  }

  // Construct city and brand regex arrays if provided
  const cityRegexArray =
    city && city.length > 0
      ? city.map((cityName) => new RegExp(cityName, "i"))
      : [];
  const vendorNameRegexArray =
    brand && brand.length > 0 ? brand.map((name) => new RegExp(name, "i")) : [];

  const matchStage = {};

  if (cityRegexArray.length > 0) {
    matchStage.city = { $in: cityRegexArray };
  }

  const products = await Product.aggregate([
    {
      $match: matchStage,
    },
    {
      $lookup: {
        from: "vendors",
        localField: "vendorId",
        foreignField: "_id",
        as: "vendor",
      },
    },
    {
      $unwind: "$vendor",
    },
    {
      $lookup: {
        from: "categories",
        localField: "categoryId",
        foreignField: "_id",
        as: "category",
      },
    },
    {
      $unwind: "$category",
    },
    {
      $lookup: {
        from: "sub_categories",
        localField: "subCategoryId",
        foreignField: "_id",
        as: "subcategory",
      },
    },
    {
      $unwind: "$subcategory",
    },
    {
      $match:
        vendorNameRegexArray.length > 0
          ? { "vendor.name": { $in: vendorNameRegexArray } }
          : {},
    },
    {
      $project: {
        _id: 1,
        productName: 1,
        productImage: 1,
        vendorId: "$vendor._id",
        vendorName: "$vendor.businessDetails.businessName",
        vendorMobile: "$vendor.mobile",
        isSubscribed: "$vendor.isPayment",
        vendorEstablishmentYear: "$vendor.establishment.year",
        catId: "$category._id",
        categoryName: "$category.categoryName",
        subCategoryId: "$subcategory._id",
        subCategoryName: "$subcategory.subCategoryName",
        singlePrice: 1,
        priceRange: 1,
        specification: 1,
        priceBasedOnQty: 1,
        city: 1,
        locationDetails: "$vendor.locationDetails",
        description: 1,
        isService: 1,
        manufacturer: 1
      },
    },
  ]);



  if (!products || products.length === 0) {
    return res.status(404).json({ message: "No data found!", success: false });
  }

  // Filter by subCategoryId if provided
  let filteredProducts = products;
  if (subCategoryId) {
    filteredProducts = filteredProducts.filter(
      (product) => product.subCategoryId.toString() === subCategoryId.toString()
    );
  }

  // Filter by categoryId if provided
  if (categoryId) {
    filteredProducts = filteredProducts.filter(
      (product) => product.catId.toString() === categoryId.toString()
    );
  }



  const currentYear = new Date().getFullYear();


  // Parse years to ranges
  let yearRanges = [];
  if (years && years.length > 0) {
    let minYear = Infinity;
    let maxYear = -Infinity;

    years.forEach((year) => {
      if (typeof year === "string" && year.includes("+")) {
        const parsedYear = parseInt(year);
        if (parsedYear < minYear) minYear = parsedYear;
        if (parsedYear > maxYear) maxYear = parsedYear;
        yearRanges.push({ min: parsedYear, max: Infinity });
      } else {
        const parsedYear = parseInt(year);
        if (parsedYear < minYear) minYear = parsedYear;
        if (parsedYear > maxYear) maxYear = parsedYear;
      }
    });

    if (minYear !== Infinity && maxYear !== -Infinity) {
      yearRanges.push({ min: minYear, max: maxYear });
    }
  } else {
    yearRanges.push({ min: 0, max: Infinity }); // Default to include all years if no years are provided
  }

  // Filter products based on parsed year ranges
  if (years && years.length > 0) {
    filteredProducts = filteredProducts.filter((product) => {
      const establishmentYear = product.vendorEstablishmentYear;
      if (!establishmentYear) return false;

      const yearDifference = currentYear - establishmentYear;

      // Check if yearDifference falls within any of the specified ranges
      return yearRanges.some(
        (range) => yearDifference >= range.min && yearDifference <= range.max
      );
    });
  }


  // Get ratings for each vendor and calculate the average rating
  const vendorIds = filteredProducts.map((product) => product.vendorId);
  const reviews = await Review.aggregate([
    {
      $match: { vendorId: { $in: vendorIds } },
    },
    {
      $group: {
        _id: "$vendorId",
        averageRating: { $avg: "$reviewStar" },
      },
    },
  ]);

  const reviewMap = new Map();
  reviews.forEach((review) => {
    reviewMap.set(review._id.toString(), review.averageRating);
  });

  // Add average rating to each product
  filteredProducts.forEach((product) => {
    product.averageRating = reviewMap.get(product.vendorId.toString()) || 0;
  });

  // Sort the filtered products based on the price and rating
  const sortedProducts = filteredProducts.sort((a, b) => {
    if (!a?.singlePrice?.price) {
      a.singlePrice.price = 0
    }
    if (!b?.singlePrice?.price) {
      b.singlePrice.price = 0
    }

    if (price === "low" && rating === "high") {
      if (a.singlePrice.price === b.singlePrice.price) {
        return b.averageRating - a.averageRating;
      }
      return a.singlePrice.price - b.singlePrice.price;
    } else if (price === "low" && rating === "low") {
      if (a.singlePrice.price === b.singlePrice.price) {
        return a.averageRating - b.averageRating;
      }
      return a.singlePrice.price - b.singlePrice.price;
    } else if (price === "high" && rating === "high") {
      if (b.singlePrice.price === a.singlePrice.price) {
        return b.averageRating - a.averageRating;
      }
      return b.singlePrice.price - a.singlePrice.price;
    } else if (price === "high" && rating === "low") {
      if (b.singlePrice.price === a.singlePrice.price) {
        return a.averageRating - b.averageRating;
      }
      return b.singlePrice.price - a.singlePrice.price;
    } else if (price === "low") {
      return a.singlePrice.price - b.singlePrice.price;
    } else if (price === "high") {
      return b.singlePrice.price - a.singlePrice.price;
    } else if (rating === "high") {
      return b.averageRating - a.averageRating;
    } else if (rating === "low") {
      return a.averageRating - b.averageRating;
    }

    return 0; // Default to no sorting if sort parameter is not provided
  });

  // Check if pagination is requested
  const isPaginationRequested = page !== undefined && limit !== undefined;
  const totalCount = sortedProducts.length;
  
  // Apply pagination if requested
  let productsToProcess = sortedProducts;
  if (isPaginationRequested) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    productsToProcess = sortedProducts.slice(skip, skip + limitNum);
  }

  const data = await Promise.all(
    productsToProcess.map(async (product) => {
      const enquiry = await Enquiry.find({ productId: product._id });

      const itemSaved = await SavedItem.findOne({
        userId: customerId,
        productId: product._id,
      });

      // Calculate the year difference
      const establishmentYear = product.vendorEstablishmentYear;
      const yearDifference = establishmentYear
        ? currentYear - establishmentYear
        : 0;

      // Process product images
      const productResImages = product.productImage.map(
        (image) =>
          `${process.env.APP_BASE_URL}/uploads/images/product/${image}`
      );

      return {
        _id: product._id,
        name: product.productName,
        image: productResImages[0],
        price: parseInt(product?.singlePrice?.price || 0)
          ? parseInt(product?.singlePrice?.price || 0)
          : 0,
        city: product.city ? product.city : "",
        locationDetails: product.locationDetails,
        manufacturer: product.manufacturer,
        vendorId: product.vendorId,
        vendorName: product.vendorName,
        categoryId: product.catId,
        mobile: product.vendorMobile,
        isSubscribed: product?.isSubscribed || false,
        year: yearDifference,
        verified: true,
        isSaved: itemSaved ? true : false,
        enquiries: enquiry.length ? enquiry.length : 0,
        isService: product.isService,
      };
    })
  );

  // Return response with data field
// Return response in unified format (similar to getProductsBasedOnVendorOrCategory)
if (isPaginationRequested) {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const totalPages = Math.ceil(totalCount / limitNum);

  res.status(200).json({
    data,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalPages,
      totalItems: totalCount,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
    success: true,
  });
} else {
  res.status(200).json({
    data,
    success: true,
  });
}
});

module.exports = { searchProduct, filterProducts, searchProductForMobile };
