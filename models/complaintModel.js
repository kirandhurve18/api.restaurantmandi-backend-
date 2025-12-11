const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    complaint: {
      type: String,
      required: true,
    },
    complaintType: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    attachment: {
      type: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Complaint", complaintSchema);
