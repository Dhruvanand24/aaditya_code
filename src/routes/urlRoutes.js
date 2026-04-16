const express = require("express");
const {
  createUrl,
  getUrls,
  updateUrl,
  deleteUrl
} = require("../controllers/urlController");

const router = express.Router();

router.post("/", createUrl);
router.get("/", getUrls);
router.put("/:id", updateUrl);
router.delete("/:id", deleteUrl);

module.exports = router;
