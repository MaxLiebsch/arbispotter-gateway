const version = process.env.APP_VERSION || require("./package.json").version;

module.exports = {
  apps: [
    {
      name: `gateway_v${version}`,
      script: "./src/server.js",
      exec_mode: "cluster_mode",
      instances: "3",
      env: {
        NODE_ENV: "production",
        PROXY_TYPE: "request",
        DEBUG: false,
        LOCAL_PORT: 8081,
      },
    },
    {
      name: `gateway2_v${version}`,
      script: "./src/server.js",
      exec_mode: "cluster_mode",
      instances: "1",
      env: {
        NODE_ENV: "production",
        PROXY_TYPE: "gb",
        DEBUG: false,
        LOCAL_PORT: 8082,
      },
    },
  ],
};
