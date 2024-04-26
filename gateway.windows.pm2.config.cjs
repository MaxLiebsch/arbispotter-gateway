module.exports = {
  apps: [
    {
      name: "gateway",
      script: "yarn",
      args: "start",
      interpreter: "none",
      exec_mode : "cluster",
      instances: "2",
      env: {
        NODE_ENV: "production",
        PROXY_TYPE: "request",
        DEBUG: false,
      },
    },
  ],
};
