const asyncHandler = require("express-async-handler");

const Coupon = require("../models/couponModel");

// @desc Verify Coupon
// @route POST /api/coupon/verify
const verifyCoupon = asyncHandler(async (req, res) => {
  const q = req.query.q;

  if (!q) {
    return res.json({ message: "No query provided!", success: false });
  }
  const coupon = await Coupon.findOne({ couponCode: q });

  if (!coupon) {
    return res.json({ message: "No coupon found!", success: false });
  }
  if (!coupon.isValid) {
    return res.json({ message: "Coupon is Expired!", success: false });
  }

  return res.json({ ...coupon._doc, success: true });
});

module.exports = { verifyCoupon };
