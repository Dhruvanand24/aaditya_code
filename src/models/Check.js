const mongoose = require("mongoose");

const checkSchema = new mongoose.Schema(
  {
    urlId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Url",
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ["up", "down"],
      required: true
    },
    responseTime: {
      type: Number,
      default: null
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false
  }
);

checkSchema.index({ urlId: 1, timestamp: -1 });

module.exports = mongoose.model("Check", checkSchema);
