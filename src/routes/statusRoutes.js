const express = require("express");
const {
  getStatusByUrlId,
  getDashboard
} = require("../controllers/statusController");

const router = express.Router();

router.get("/status/:urlId", getStatusByUrlId);
router.get("/dashboard", getDashboard);

module.exports = router;
