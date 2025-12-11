const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

router.get("/", (req, res) => {
  const guestUser = {
    role: "guest",
    permissions: ["read-only"],
  };

  const token = jwt.sign(guestUser, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1h",
  });

  res.json({ token });
});

module.exports = router;
