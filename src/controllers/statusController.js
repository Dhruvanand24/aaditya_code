const mongoose = require("mongoose");
const Url = require("../models/Url");
const Check = require("../models/Check");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

const FALLBACK_CHECK_WINDOW = 100;
const DASHBOARD_TREND_HOURS = 24;
const NORMALIZED_STATUS_EXPRESSION = {
  $toLower: {
    $convert: {
      input: {
        $cond: [{ $isArray: "$status" }, { $arrayElemAt: ["$status", 0] }, "$status"]
      },
      to: "string",
      onError: "down",
      onNull: "down"
    }
  }
};

function normalizeStatusValue(rawStatus) {
  if (typeof rawStatus !== "string") {
    return "down";
  }

  const normalized = rawStatus.toLowerCase();
  return normalized === "up" ? "up" : "down";
}

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
          $sum: { $cond: [{ $eq: [NORMALIZED_STATUS_EXPRESSION, "up"] }, 1, 0] }
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
            $sum: { $cond: [{ $eq: [NORMALIZED_STATUS_EXPRESSION, "up"] }, 1, 0] }
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
  const monitoredUrls = await Url.aggregate([
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
        currentStatus: {
          $toLower: {
            $convert: {
              input: {
                $cond: [
                  { $isArray: "$latestCheck.status" },
                  { $arrayElemAt: ["$latestCheck.status", 0] },
                  "$latestCheck.status"
                ]
              },
              to: "string",
              onError: "down",
              onNull: "down"
            }
          }
        },
        lastCheckedTime: { $ifNull: ["$latestCheck.timestamp", null] },
        latestResponseTime: {
          $convert: {
            input: "$latestCheck.responseTime",
            to: "double",
            onError: null,
            onNull: null
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        urlId: "$_id",
        url: 1,
        name: 1,
        currentStatus: 1,
        lastCheckedTime: 1,
        latestResponseTime: 1
      }
    },
    { $sort: { url: 1 } }
  ]);

  const urls = monitoredUrls.map((item) => ({
    ...item,
    currentStatus: normalizeStatusValue(item.currentStatus)
  }));

  const summary = urls.reduce(
    (acc, item) => {
      const status = normalizeStatusValue(item.currentStatus);
      if (status === "up") {
        acc.upUrls += 1;
      } else {
        acc.downUrls += 1;
      }
      return acc;
    },
    {
      totalUrls: urls.length,
      upUrls: 0,
      downUrls: 0
    }
  );

  const trendStart = new Date(Date.now() - DASHBOARD_TREND_HOURS * 60 * 60 * 1000);
  const trendBuckets = await Check.aggregate([
    { $match: { timestamp: { $gte: trendStart } } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%dT%H:00:00.000Z",
            date: "$timestamp"
          }
        },
        totalChecks: { $sum: 1 },
        upChecks: {
          $sum: {
            $cond: [{ $eq: [NORMALIZED_STATUS_EXPRESSION, "up"] }, 1, 0]
          }
        },
        downChecks: {
          $sum: {
            $cond: [{ $eq: [NORMALIZED_STATUS_EXPRESSION, "down"] }, 1, 0]
          }
        },
        averageResponseTime: { $avg: "$responseTime" }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const trendByHour = new Map(
    trendBuckets.map((bucket) => [
      bucket._id,
      {
        totalChecks: bucket.totalChecks,
        upChecks: bucket.upChecks,
        downChecks: bucket.downChecks,
        averageResponseTime:
          bucket.averageResponseTime === null
            ? null
            : Number(bucket.averageResponseTime.toFixed(2))
      }
    ])
  );

  const trend = [];
  for (let offset = DASHBOARD_TREND_HOURS - 1; offset >= 0; offset -= 1) {
    const hour = new Date(Date.now() - offset * 60 * 60 * 1000);
    hour.setMinutes(0, 0, 0);
    const bucketKey = hour.toISOString();
    const bucket = trendByHour.get(bucketKey) || {
      totalChecks: 0,
      upChecks: 0,
      downChecks: 0,
      averageResponseTime: null
    };

    trend.push({
      timestamp: bucketKey,
      totalChecks: bucket.totalChecks,
      upChecks: bucket.upChecks,
      downChecks: bucket.downChecks,
      uptimePercentage:
        bucket.totalChecks > 0
          ? Number(((bucket.upChecks / bucket.totalChecks) * 100).toFixed(2))
          : 0,
      averageResponseTime: bucket.averageResponseTime
    });
  }

  const checksLast24h = trend.reduce(
    (acc, bucket) => {
      acc.totalChecks += bucket.totalChecks;
      acc.upChecks += bucket.upChecks;
      acc.downChecks += bucket.downChecks;

      if (typeof bucket.averageResponseTime === "number") {
        acc.responseTimeSum += bucket.averageResponseTime * bucket.totalChecks;
      }
      return acc;
    },
    {
      totalChecks: 0,
      upChecks: 0,
      downChecks: 0,
      responseTimeSum: 0
    }
  );

  const averageResponseTime =
    checksLast24h.totalChecks > 0
      ? Number((checksLast24h.responseTimeSum / checksLast24h.totalChecks).toFixed(2))
      : null;
  const uptimePercentage =
    checksLast24h.totalChecks > 0
      ? Number(((checksLast24h.upChecks / checksLast24h.totalChecks) * 100).toFixed(2))
      : 0;

  res.status(200).json({
    success: true,
    data: {
      totalUrls: summary.totalUrls,
      upUrls: summary.upUrls,
      downUrls: summary.downUrls,
      checksLast24h: {
        totalChecks: checksLast24h.totalChecks,
        upChecks: checksLast24h.upChecks,
        downChecks: checksLast24h.downChecks,
        averageResponseTime,
        uptimePercentage
      },
      trend,
      urls
    }
  });
});

module.exports = {
  getStatusByUrlId,
  getDashboard
};
