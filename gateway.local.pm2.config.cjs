module.exports = {
  apps: [
    {
      name: "gateway",
      script: "yarn",
      args: "start",
      exec_mode : "cluster",
      instances: "4",
      env: {
        NODE_ENV: "production",
        PROXY_TYPE: "request",
        DEBUG: false,
      },
    },
  ],
};
