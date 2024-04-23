module.exports = {
  apps: [
    {
      name: "gateway",
      script: "yarn",
      args: "--cwd '/root/arbispotter-gateway' start",
      interpreter: "/bin/bash",
      env: {
        NODE_ENV: "production",
        PROXY_TYPE: "request",
        DEBUG: false,
      },
    },
  ],
};
