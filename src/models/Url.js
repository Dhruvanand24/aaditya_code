const mongoose = require("mongoose");

const urlSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    name: {
      type: String,
      trim: true,
      default: ""
    },
    checkInterval: {
      type: Number,
      default: 60,
      min: 10
    },
    webhookUrl: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Url", urlSchema);
