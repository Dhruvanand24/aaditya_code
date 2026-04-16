const mongoose = require("mongoose");
const Url = require("../models/Url");
const Check = require("../models/Check");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const {
  isValidHttpUrl,
  normalizeCheckInterval
} = require("../utils/validators");
const healthCheckScheduler = require("../jobs/healthCheckScheduler");

const createUrl = asyncHandler(async (req, res) => {
  const { url, name, checkInterval, webhookUrl } = req.body;

  if (!url || !isValidHttpUrl(url)) {
    throw new AppError("A valid URL is required", 400);
  }

  if (webhookUrl && !isValidHttpUrl(webhookUrl)) {
    throw new AppError("webhookUrl must be a valid http/https URL", 400);
  }

  const normalizedInterval = normalizeCheckInterval(checkInterval, 60);
  if (normalizedInterval === null) {
    throw new AppError("checkInterval must be an integer >= 10 seconds", 400);
  }

  const exists = await Url.findOne({ url });
  if (exists) {
    throw new AppError("This URL is already being monitored", 409);
  }

  const created = await Url.create({
    url,
    name: name || "",
    checkInterval: normalizedInterval,
    webhookUrl: webhookUrl || ""
  });

  await healthCheckScheduler.upsertUrl(created._id);

  res.status(201).json({
    success: true,
    data: created
  });
});

const getUrls = asyncHandler(async (_req, res) => {
  const urls = await Url.find({}).sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    count: urls.length,
    data: urls
  });
});

const updateUrl = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { url, name, checkInterval, webhookUrl } = req.body;

  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid URL id", 400);
  }

  const updatePayload = {};

  if (url !== undefined) {
    if (!isValidHttpUrl(url)) {
      throw new AppError("url must be a valid http/https URL", 400);
    }
    updatePayload.url = url;
  }

  if (webhookUrl !== undefined) {
    if (webhookUrl && !isValidHttpUrl(webhookUrl)) {
      throw new AppError("webhookUrl must be a valid http/https URL", 400);
    }
    updatePayload.webhookUrl = webhookUrl || "";
  }

  if (name !== undefined) {
    updatePayload.name = name;
  }

  if (checkInterval !== undefined) {
    const normalizedInterval = normalizeCheckInterval(checkInterval, 60);
    if (normalizedInterval === null) {
      throw new AppError("checkInterval must be an integer >= 10 seconds", 400);
    }
    updatePayload.checkInterval = normalizedInterval;
  }

  const updated = await Url.findByIdAndUpdate(id, updatePayload, {
    new: true,
    runValidators: true
  });

  if (!updated) {
    throw new AppError("Monitored URL not found", 404);
  }

  await healthCheckScheduler.upsertUrl(updated._id);

  res.status(200).json({
    success: true,
    data: updated
  });
});

const deleteUrl = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid URL id", 400);
  }

  const deleted = await Url.findByIdAndDelete(id);
  if (!deleted) {
    throw new AppError("Monitored URL not found", 404);
  }

  await Check.deleteMany({ urlId: id });
  healthCheckScheduler.removeUrl(id);

  res.status(200).json({
    success: true,
    message: "URL removed from monitoring"
  });
});

module.exports = {
  createUrl,
  getUrls,
  updateUrl,
  deleteUrl
};
