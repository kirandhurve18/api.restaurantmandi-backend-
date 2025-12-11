const mongoose = require("mongoose");
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")

const adminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String,
      required: true
    },
    refreshToken: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const hashed = await bcrypt.hash(this.password, 10);
  this.password = hashed;
  next();
});

adminSchema.methods.isPasswordCorrect = async function(password) {
  return await bcrypt.compare(password, this.password)
}

adminSchema.methods.generateAccessToken = function() {
  return jwt.sign(
    { id : this._id },
    process.env.ACCESS_TOKEN_SECRET,
    {expiresIn: process.env.ACCESS_TOKEN_EXPIRY}
  )
}

adminSchema.methods.generateRefreshToken = function() {
  return jwt.sign(
    { id : this._id },
    process.env.REFRESH_TOKEN_SECRET,
    {expiresIn: process.env.REFRESH_TOKEN_EXPIRY}
  )
}

module.exports = mongoose.model("Admin", adminSchema);