const asyncHandler = require("express-async-handler");

const Review = require("../models/reviewModel");

// Create Review
// const createReview = asyncHandler(async (req, res) => {
//   let data = req.body;

//   if (!data.customerId) {
//     return res
//       .status(400)
//       .json({ message: "Customer ID is required!", success: false });
//   }
//   if (!data.vendorId) {
//     return res
//       .status(400)
//       .json({ message: "Vendor ID is required!", success: false });
//   }
//   if (!data.reviewStar) {
//     return res
//       .status(400)
//       .json({ message: "Customer Review is required!", success: false });
//   }

//   const review = await Review.create(data);

//   if (!review)
//     return res
//       .status(400)
//       .json({ message: "Error while adding review!", success: false });

//   const createdAtDate = new Date(review.createdAt).toISOString().split("T")[0];

//   const result = {
//     _id: review._id,
//     customerId: review.customerId,
//     vendorId: review.vendorId,
//     reviewStar: parseInt(review.reviewStar),
//     comment: review.comment,
//     createdAt: createdAtDate,
//   };

//   res.status(201).json({ data: result, success: true });
// });

const createReview = asyncHandler(async (req, res) => {
  let data = req.body;

  if (!data.customerId) {
    return res
      .status(400)
      .json({ message: "Customer ID is required!", success: false });
  }
  if (!data.vendorId) {
    return res
      .status(400)
      .json({ message: "Vendor ID is required!", success: false });
  }
  if (!data.reviewStar) {
    return res
      .status(400)
      .json({ message: "Customer Review is required!", success: false });
  }

  // ✅ Check if review already exists for this customer & vendor
  let review = await Review.findOne({
    customerId: data.customerId,
    vendorId: data.vendorId,
  });

  if (review) {
    // ✅ Update existing review
    review.reviewStar = data.reviewStar;
    review.comment = data.comment || review.comment;
    review.updatedAt = new Date();
    await review.save();
  } else {
    // ✅ Create new review
    review = await Review.create(data);
  }

  if (!review) {
    return res
      .status(400)
      .json({ message: "Error while adding review!", success: false });
  }

  // Format createdAt date (YYYY-MM-DD)
  const createdAtDate = new Date(review.createdAt).toISOString().split("T")[0];

  const result = {
    _id: review._id,
    customerId: review.customerId,
    vendorId: review.vendorId,
    reviewStar: parseInt(review.reviewStar),
    comment: review.comment,
    createdAt: createdAtDate,
  };

  res.status(review.isNew ? 201 : 200).json({
    data: result,
    message: review.isNew
      ? "Review created successfully"
      : "Review updated successfully",
    success: true,
  });
});


// Get Vendor Related Reviews
const getVendorRelatedReviews = asyncHandler(async (req, res) => {
  const { vendorId, status } = req.query;
  const page = parseInt(req?.query?.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  if (!vendorId) {
    return res
      .status(400)
      .json({ message: "Vendor ID is required!", success: false });
  }

  let query = { vendorId };

  let sortOptions = {};
  if (status == "latest") {
    sortOptions = { createdAt: -1 };
  } else if (status == "high") {
    sortOptions = { reviewStar: -1 };
  } else if (status == "low") {
    sortOptions = { reviewStar: 1 };
  }

  const reviews = await Review.find(query)
    .populate("customerId")
    .populate("vendorId")
    .sort(sortOptions)
    .skip(skip)
    .limit(limit);

  if (!reviews || reviews.length === 0) {
    return res
      .status(400)
      .json({ message: "Error while getting reviews!", success: false });
  }

  const reviewCount = await Review.countDocuments(query);

  let totalRating = 0;
  let ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  // Calculate total rating and count occurrences of each rating
  reviews.forEach((review) => {
    totalRating += review.reviewStar;
    ratingCounts[review.reviewStar]++;
  });

  // Calculate average rating
  const averageRating = totalRating / reviews.length;

  // Calculate percentage of ratings for each value
  const ratingPercentages = {};
  Object.keys(ratingCounts).forEach((key) => {
    ratingPercentages[key] = Math.round(
      ((ratingCounts[key] / reviews.length) * 100).toFixed(2)
    );
  });

  const reviewsWithImage = reviews.map((item) => {
    const createdAtDate = new Date(item.createdAt).toISOString().split("T")[0];
    return {
      _id: item._id,
      vendorId: item.vendorId._id,
      customerId: item?.customerId?._id,
      customerName: item?.customerId?.name,
      image: item?.customerId?.profileImage
        ? `${process.env.APP_BASE_URL}/uploads/images/customer/${item?.customerId?.profileImage}`
        : `${process.env.APP_BASE_URL}/uploads/images/review/profile.png`,
      reviewStar: parseInt(item.reviewStar),
      comment: item.comment,
      createdAt: createdAtDate,
    };
  });

  res.status(200).json({
    data: reviewsWithImage,
    vendorName: reviews[0].vendorId.name,
    total: reviewCount,
    averageRating: parseFloat(averageRating.toFixed(2)),
    ratingPercentages: ratingPercentages,
    success: true,
  });
});

module.exports = { createReview, getVendorRelatedReviews };
