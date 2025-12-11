const mongoose = require("mongoose");

const payuResponseSchema = new mongoose.Schema(
  {
    response: {
      type: Object, // store the full JSON response
      required: true
    },
    email: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("payuResponse", payuResponseSchema);
