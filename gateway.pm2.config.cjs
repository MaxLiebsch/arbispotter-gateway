module.exports = {
  apps: [
    {
      name: "gateway",
      script: "/root/.nvm/versions/node/v20.11.1/bin/yarn",
      args: "--cwd '/root/arbispotter-gateway' start",
      interpreter: "/root/.nvm/versions/node/v20.11.1/bin/node",
      env: {
        NODE_ENV: "production",
        PROXY_TYPE: "request",
        DEBUG: false,
      },
    },
  ],
};
