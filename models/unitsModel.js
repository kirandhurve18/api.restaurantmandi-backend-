const mongoose = require("mongoose");

const unitSchema = new mongoose.Schema(
  {
    unitName: {
      type: String,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Unit", unitSchema);
