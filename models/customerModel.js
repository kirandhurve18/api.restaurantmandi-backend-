const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs")

const deviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  fcmId: { type: String },
  hashKey: { type: String },
  otp: { type: Number },
  refreshToken: { type: String }
}, { _id: false });

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      // required: true,
    },
    mobile: {
      type: Number,
      required: true,
      unique: true,
    },
    gender: {
      type: String,
    },
    dob: {
      type: String,
    },
    // otp: {
    //   type: Number,
    // },
    // deviceId: {
    //   type: String,
    // },
    // fcmId: {
    //   type: String,
    // },
    // hashKey: {
    //   type: String,
    // },
    // refreshToken: {
    //   type: String
    // },
    devices: [deviceSchema],
    profileImage: {
      type: String,
    },
    status: {
      type: Number,
      default: 1,
    },
    restaurant_name: {
      type: String
    },
    rest_id:{
      type: String,
    },
    unique_id:{
      type: String,
    }
  },
  { timestamps: true }
);

customerSchema.methods.isPasswordCorrect = async function(password) {
  return await bcrypt.compare(password, this.password)
}

customerSchema.methods.generateAccessToken = function(deviceId) {
  return jwt.sign(
    { id : this._id, deviceId },
    process.env.ACCESS_TOKEN_SECRET,
    {expiresIn: process.env.ACCESS_TOKEN_EXPIRY}
  )
}

customerSchema.methods.generateRefreshToken = function(deviceId) {
  return jwt.sign(
    { id : this._id, deviceId},
    process.env.REFRESH_TOKEN_SECRET,
    {expiresIn: process.env.REFRESH_TOKEN_EXPIRY}
  )
}

module.exports = mongoose.model("Customer", customerSchema);
