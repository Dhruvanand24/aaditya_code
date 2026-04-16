const mongoose = require("mongoose");
const Url = require("../models/Url");
const Check = require("../models/Check");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

const FALLBACK_CHECK_WINDOW = 100;

const getStatusByUrlId = asyncHandler(async (req, res) => {
  const { urlId } = req.params;

  if (!mongoose.isValidObjectId(urlId)) {
    throw new AppError("Invalid urlId", 400);
  }

  const url = await Url.findById(urlId).lean();
  if (!url) {
    throw new AppError("Monitored URL not found", 404);
  }

  const objectId = new mongoose.Types.ObjectId(urlId);
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  let metricWindow = "last24h";
  let metricResult = await Check.aggregate([
    {
      $match: {
        urlId: objectId,
        timestamp: { $gte: last24h }
      }
    },
    {
      $group: {
        _id: null,
        totalChecks: { $sum: 1 },
        upChecks: {
          $sum: { $cond: [{ $eq: ["$status", "up"] }, 1, 0] }
        },
        averageResponseTime: { $avg: "$responseTime" }
      }
    }
  ]);

  if (!metricResult.length || metricResult[0].totalChecks === 0) {
    metricWindow = `last${FALLBACK_CHECK_WINDOW}Checks`;
    metricResult = await Check.aggregate([
      { $match: { urlId: objectId } },
      { $sort: { timestamp: -1 } },
      { $limit: FALLBACK_CHECK_WINDOW },
      {
        $group: {
          _id: null,
          totalChecks: { $sum: 1 },
          upChecks: {
            $sum: { $cond: [{ $eq: ["$status", "up"] }, 1, 0] }
          },
          averageResponseTime: { $avg: "$responseTime" }
        }
      }
    ]);
  }

  const stats = metricResult[0] || {
    totalChecks: 0,
    upChecks: 0,
    averageResponseTime: null
  };

  const uptimePercentage =
    stats.totalChecks > 0 ? (stats.upChecks / stats.totalChecks) * 100 : 0;

  const last10Checks = await Check.find({ urlId: objectId })
    .sort({ timestamp: -1 })
    .limit(10)
    .lean();

  res.status(200).json({
    success: true,
    data: {
      urlId,
      url: url.url,
      metricWindow,
      uptimePercentage: Number(uptimePercentage.toFixed(2)),
      averageResponseTime:
        stats.averageResponseTime === null
          ? null
          : Number(stats.averageResponseTime.toFixed(2)),
      last10Checks
    }
  });
});

const getDashboard = asyncHandler(async (_req, res) => {
  const dashboardAgg = await Url.aggregate([
    {
      $lookup: {
        from: "checks",
        let: { monitorId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$urlId", "$$monitorId"] }
            }
          },
          { $sort: { timestamp: -1 } },
          { $limit: 1 }
        ],
        as: "latestCheck"
      }
    },
    {
      $addFields: {
        latestCheck: { $arrayElemAt: ["$latestCheck", 0] },
        currentStatus: { $ifNull: ["$latestCheck.status", "down"] },
        lastCheckedTime: { $ifNull: ["$latestCheck.timestamp", null] }
      }
    },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              totalUrls: { $sum: 1 },
              upUrls: {
                $sum: { $cond: [{ $eq: ["$currentStatus", "up"] }, 1, 0] }
              },
              downUrls: {
                $sum: { $cond: [{ $eq: ["$currentStatus", "down"] }, 1, 0] }
              }
            }
          }
        ],
        urls: [
          {
            $project: {
              _id: 0,
              urlId: "$_id",
              url: 1,
              name: 1,
              currentStatus: 1,
              lastCheckedTime: 1
            }
          },
          { $sort: { url: 1 } }
        ]
      }
    }
  ]);

  const result = dashboardAgg[0] || { summary: [], urls: [] };
  const summary = result.summary[0] || {
    totalUrls: 0,
    upUrls: 0,
    downUrls: 0
  };

  res.status(200).json({
    success: true,
    data: {
      totalUrls: summary.totalUrls,
      upUrls: summary.upUrls,
      downUrls: summary.downUrls,
      urls: result.urls
    }
  });
});

module.exports = {
  getStatusByUrlId,
  getDashboard
};
