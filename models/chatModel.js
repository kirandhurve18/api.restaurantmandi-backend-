const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    enquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enquiry",
      required: true,
    },
    message: {
      type: String,
    },
    timestamp: {
      type: String,
    },
    userType: {
      type: String,
    },
    seenByCustomerAt: {
      type: Date,
      default: function () {
        if (this.userType === "client") return new Date();
        if (this.userType === "vendor") return null;
        return null;
      },
    },
    seenByVendorAt: {
      type: Date,
      default: function () {
        if (this.userType === "vendor") return new Date();
        if (this.userType === "client") return null;
        return null;
      },
    },
  },
  {
    timestamps: true,
  }
);

// module.exports = mongoose.model("Chat", chatSchema);
module.exports = mongoose.models.Chat || mongoose.model("Chat", chatSchema);
