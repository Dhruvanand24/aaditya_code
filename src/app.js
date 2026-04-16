const express = require("express");
const urlRoutes = require("./routes/urlRoutes");
const statusRoutes = require("./routes/statusRoutes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/urls", urlRoutes);
app.use("/", statusRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
