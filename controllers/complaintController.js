const asyncHandler = require("express-async-handler");
const Vendor = require("../models/vendorModel");
const Complaint = require("../models/complaintModel");

const createComplaint = asyncHandler(async (req, res) => {
  const { vendorId, complaint, complaintType, description } = req.body;

  if (!vendorId) {
    return res.json({ message: "Vendor Id is required", success: false });
  }

  const vendor = await Vendor.findById(vendorId);

  if (!vendor) {
    return res.json({ message: "Vendor not found", success: false });
  }

  if (!complaint) {
    return res.json({ message: "Complaint is required", success: false });
  }

  if (!complaintType) {
    return res.json({ message: "Complaint type is required", success: false });
  }

  let data = {
    vendorId,
    complaint,
    complaintType,
    description,
  };

  let attachmentImages = [];

  if (req.files && req.files.length > 0) {
    req.files.forEach((file) => {
      const filenameWithoutSpaces = file.filename.replace(/\s+/g, "");
      if (file.fieldname === "attachment") {
        attachmentImages.push(filenameWithoutSpaces);
      }
    });
  }

  data.attachment = attachmentImages;

  const createComplaint = await Complaint.create(data);

  if (createComplaint) {
    const attachmentImageURLs = attachmentImages.map(
      (filename) =>
        `${process.env.APP_BASE_URL}/uploads/images/complaints/${filename}`
    );

    return res.status(201).json({
      ...createComplaint.toObject(),
      attachment: attachmentImageURLs,
      success: true,
    });
  } else {
    return res
      .status(500)
      .json({ message: "Complaint creation failed.", success: false });
  }
});

const getVendorComplaints = asyncHandler(async (req, res) => {
  const vendorId = req.query.vendorId;

  if (!vendorId) {
    return res.json({ message: "Vendor Id is required", success: false });
  }

  const complaints = await Complaint.find({ vendorId: vendorId });

  if (!complaints || complaints.length === 0) {
    return res.json({ message: "No complaints found", success: false });
  }

  res.json({ data: complaints, success: true });
});

module.exports = { createComplaint, getVendorComplaints };
