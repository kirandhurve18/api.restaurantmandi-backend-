const mongoose = require("mongoose");
const Counter = require("./counterModel");


const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Point"],
    default: "Point",
    required: true,
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true,
  },
});

const vendorSchema = new mongoose.Schema(
  {
    sup_id: {
      type: Number,
      unique: true
    },
    name: {
      type: String,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
    },
    mobile: {
      type: Number,
    },
    alternateMobile: {
      type: Number,
    },
    status: {
      type: String,
      default: "0",
    },
    sup_status: {
      type: String,
      default: "COLD"
    },
    sup_followup_status: {
      type: String,
      default: "new_lead"
    },
    otp: {
      type: Number,
    },
    address: {
      type: String,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
    },
    pincode: {
      type: String,
    },
    leadSource: {
      type: String,
      default: null
    },
    onboardedBy: {
      type: String,
      default: null
    },
    fren_user_id: {
      type: Number
    },
    subscription_plan: {
      type: String,
      default: null
    },
    subscription_status: {
      type: String,
      default: "inactive"
    },
    trackedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null
    },
    businessWebsite: {
      website: {
        type: String,
      },
      number: {
        type: String,
      },
    },
    categories: {
      type: [
        {
          categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
          categoryName: { type: String },
        },
      ],
    },
    businessDetails: {
      businessName: { type: String },
      legalBusinessName: { type: String },
    },
    contactDetails: {
      contactName: { type: String },
      designation: { type: String },
      owner: { type: String },
      whatsapp: { type: Number },
      mobileNumber: { type: Number },
      emailAddress: { type: String },
      landline: { type: Number },
      tollFreeNumber: { type: Number },
    },
    locationDetails: {
      buildingName: { type: String },
      streetName: { type: String },
      landmark: { type: String },
      area: { type: String },
      stdcode: { type: String, default: null },
      gps: pointSchema,
      pincode: { type: Number },
      city: { type: String },
      state: { type: String },
      country: { type: String },
    },
    businessTimings: {
      regular: {
        days: [],
        regularTime: [{ openAt: { type: String }, closeAt: { type: String } }],
      },
      holiday: {
        days: [],
        holidayTimings: [
          { openAt: { type: String }, closeAt: { type: String } },
        ],
      },
      isAdditionalNote: { type: Boolean, default: false },
      notes: { type: String },
    },
    establishment: {
      month: { type: String },
      year: { type: String },
    },
    turnover: {
      type: String,
    },
    employees: {
      type: String,
    },
    social: {
      facebook: { type: String },
      instagram: { type: String },
      twitter: { type: String },
      youtube: { type: String },
      linkedin: { type: String },
      others: { type: String },
    },
    deviceId: {
      type: String,
    },
    fcmId: {
      type: String,
    },
    hashKey: {
      type: String,
    },
    profileImage: {
      type: String,
    },
    isPayment: {
      type: Boolean,
      default: false,
    },
    notes: {
      userId: { type: String },
      response: { type: String },
      amount: { type: String },
    },
    razorpayResponse: {
      razorpayPaymentId: { type: String },
      razorpayOrderId: { type: String },
      razorpaySignature: { type: String },
    },
    easeBuzzResponse: {
      bankRefNumber: { type: String },
      easepayId: { type: String },
      email: { type: String },
      hash: { type: String },
      key: { type: String },
      status: { type: String },
      txnId: { type: String },
    },
    payuResponse: {
      bankRefNumber: { type: String },
      email: { type: String },
      hash: { type: String },
      key: { type: String },
      status: { type: String },
      txnId: { type: String },
      mihpayid: { type: String },
      paymentMode: { type: String },
      amount: { type: String },
      subscriptionStart: { type: Date },
      subscriptionEnd: { type: Date }
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    // commentHistory: [commentSchema],
    // auditHistory: [auditSchema],
    remarks: { type: String },
    lastOnline: { type: Date, default: Date.now },
    isCouponApplied: { type: Boolean, default: false },
    couponAmount: { type: String },
    couponCode: { type: String },
    couponDiscount: { type: String },
    rateCard: { type: [] },
    gallery: { type: [] },
    kyc: {
      businessType: { type: String },
      personName: { type: String },
      hasGstin: { type: Boolean, default: false },
      isGstVerified: { type: Boolean, default: false },
      gstNumber: { type: String },
      temporaryGstNumber: { type: String }
    },
  },
  { timestamps: true }
);

// Pre-save hook to auto-increment seq_id
vendorSchema.pre("save", async function (next) {
  if (this.isNew) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        "vendor_sup_id",
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.sup_id = counter.seq;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

vendorSchema.index({ "locationDetails.gps": "2dsphere" });
module.exports = mongoose.model("Vendor", vendorSchema);
