const version = process.env.APP_VERSION || require("./package.json").version;

module.exports = {
  apps: [
    {
      name: `gateway_v${version}`,
      script: "./src/server.js",
      exec_mode : "cluster_mode",
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      instances: "4",
      env: {
        NODE_ENV: "production",
        PROXY_TYPE: "mix",
        DEBUG: false,
        LOCAL_PORT: 8081
      },
    },
    {
      name: `gateway2_v${version}`,
      script: "./src/server.js",
      exec_mode : "cluster_mode",
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      instances: "2",
      env: {
        NODE_ENV: "production",
        PROXY_TYPE: "de",
        DEBUG: false,
        LOCAL_PORT: 8082
      },
    },
  ],
};
