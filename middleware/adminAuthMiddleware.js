const jwt = require("jsonwebtoken");
const Admin = require("../models/adminModel")

const adminAuth = async (req, res, next) => {
  const token = req.header("Authorization").replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = await Admin.findById(decoded.id);
    next();
  } catch (e) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

module.exports = adminAuth;
