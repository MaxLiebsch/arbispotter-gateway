module.exports = {
  apps: [
    {
      name: "gateway",
      script: "yarn",
      args: "start",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
        PROXY_TYPE: "request",
        DEBUG: false,
      },
    },
  ],
};
