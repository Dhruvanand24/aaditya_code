const Url = require("../models/Url");
const { performCheck } = require("../services/httpCheckerService");
const logger = require("../utils/logger");

class HealthCheckScheduler {
  constructor() {
    this.timers = new Map();
    this.running = false;
  }

  async start() {
    if (this.running) {
      return;
    }

    this.running = true;
    const urls = await Url.find({}).lean();

    await Promise.all(urls.map((urlDoc) => this.scheduleImmediate(urlDoc._id)));
    logger.info(`Scheduler started with ${urls.length} URL(s)`);
  }

  stop() {
    this.running = false;
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    logger.info("Scheduler stopped");
  }

  async upsertUrl(urlId) {
    if (!this.running) {
      return;
    }

    await this.scheduleImmediate(urlId);
  }

  removeUrl(urlId) {
    const key = urlId.toString();
    const existingTimer = this.timers.get(key);

    if (existingTimer) {
      clearTimeout(existingTimer);
      this.timers.delete(key);
    }
  }

  async scheduleImmediate(urlId) {
    const key = urlId.toString();
    this.removeUrl(key);

    const timer = setTimeout(async () => {
      await this.runOnce(key);
    }, 0);

    this.timers.set(key, timer);
  }

  async runOnce(urlId) {
    if (!this.running) {
      return;
    }

    try {
      const urlDoc = await Url.findById(urlId);

      if (!urlDoc) {
        this.removeUrl(urlId);
        return;
      }

      await performCheck(urlDoc);

      if (!this.running) {
        return;
      }

      const intervalMs = Number(urlDoc.checkInterval) * 1000;
      const timer = setTimeout(async () => {
        await this.runOnce(urlId);
      }, intervalMs);

      this.timers.set(urlId.toString(), timer);
    } catch (error) {
      logger.error(`Scheduler run failed for URL ${urlId}`, error.message);

      if (this.running) {
        const timer = setTimeout(async () => {
          await this.runOnce(urlId);
        }, 10000);
        this.timers.set(urlId.toString(), timer);
      }
    }
  }
}

module.exports = new HealthCheckScheduler();
