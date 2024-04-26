module.exports = {
  apps: [
    {
      name: "gateway",
      script: "./src/server.js",
      // args: "start",
      exec_mode : "cluster_mode",
      instances: "4",
      env: {
        NODE_ENV: "production",
        PROXY_TYPE: "request",
        DEBUG: false,
      },
    },
  ],
};
