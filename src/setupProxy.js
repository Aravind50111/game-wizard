const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: "https://go.playdigidash.io", // live backend
      changeOrigin: true,
      secure: true,
      ws: true,
      // IMPORTANT: do NOT strip /api; upstream should see /api/...
      // pathRewrite: { "^/api": "" }, // <- leave this OUT
    })
  );
};
