import http from "http";
import net from "net";
import { URL } from "url";
import "dotenv/config";
import { config } from "dotenv";

config({
  path: [`.env.${process.env.NODE_ENV}`],
});

// Define your username and password
const USERNAME = process.env.BASIC_AUTH_USERNAME;
const PASSWORD = process.env.BASIC_AUTH_PASSWORD;
const PORT = process.env.PORT || 8081;

const PROXY_USERNAME = process.env.PROXY_USERNAME;
const PROXY_PASSWORD = process.env.PROXY_PASSWORD;

const proxyHosts = Object.entries(process.env).reduce((acc, [key, host]) => {
  if (key.trim().startsWith("PROXY_HOST_")) {
    acc.push(`http://${PROXY_USERNAME}:${PROXY_PASSWORD}@${host}`);
  }
  return acc;
}, []);

const establishedConnections = {};

const numberOfProxies = proxyHosts.length;
let currProxyIdx = 0;

const nextProxyUrlStr = () => {
  // default one proxy
  if (numberOfProxies === 1) {
    return proxyHosts[0];
  }

  if (currProxyIdx === 0) {
    currProxyIdx += 1;
    return proxyHosts[0];
  } else if (currProxyIdx === numberOfProxies) {
    currProxyIdx = 0;
    currProxyIdx += 1;
    return proxyHosts[0];
  } else {
    const curr = currProxyIdx;
    currProxyIdx += 1;
    return proxyHosts[curr];
  }
};

// Create a basic authentication header
const basicAuthHeader = Buffer.from(`${USERNAME}:${PASSWORD}`).toString(
  "base64"
);

// Create an HTTP server to handle incoming requests
const server = http.createServer((req, res) => {
  res.writeHead(403, { "Content-Type": "text/plain" });
  res.end("Forbidden");
});

server.listen(PORT, () => {
  console.log("Forward proxy server running on port " + "8081");
});

// Create a TCP server to handle CONNECT requests
server.on("connect", (req, clientSocket, head) => {
  // Parse the request URL
  const { hostname, port } = new URL(`http://${req.url}`);

  // Check if the request includes basic authentication header
  const authHeader = req.headers["proxy-authorization"];
  if (!authHeader || authHeader !== "Basic " + basicAuthHeader) {
    clientSocket.write(
      "HTTP/1.1 407 Proxy Authentication Required\r\n" +
        'Proxy-Authenticate: Basic realm="Proxy Server"\r\n' +
        "\r\n"
    );
    clientSocket.end();
    return;
  }

  const targetHostPort = `${hostname}:${port}`;

  const proxyUrlStr = nextProxyUrlStr();
  const forwardProxyUrl = new URL(proxyUrlStr);

  const proxyAuth = Buffer.from(
    `${forwardProxyUrl.username}:${forwardProxyUrl.password}`
  ).toString("base64");

  const proxyConnectRequest = [
    `CONNECT ${targetHostPort} HTTP/1.1`,
    `Host: ${targetHostPort}`,
    `Proxy-Authorization: Basic ${proxyAuth}`,
    "Connection: keep-alive",
    "",
    "",
  ].join("\r\n");

  // Establish a new connection
  establishedConnection(
    clientSocket,
    forwardProxyUrl,
    targetHostPort,
    proxyConnectRequest,
    head
  );

  // Handle errors on the client socket
  clientSocket.on("error", (err) => {
    console.error("Client socket error:", err);
  });
});

server.on('error', (error) => {
  console.log('Proxy Server error:', error)
})



const establishedConnection = (
  clientSocket,
  forwardProxyUrl,
  targetHostPort,
  proxyConnectRequest,
  head
) => {
  const proxySocket = net.connect(
    forwardProxyUrl.port,
    forwardProxyUrl.hostname
  );

  proxySocket.once("connect", () => {
    // Send the CONNECT request with Basic Auth to the forward proxy
    proxySocket.write(proxyConnectRequest);

    // Wait for the proxy's response
    proxySocket.once("data", (chunk) => {
      const chunkStr = chunk.toString();
      // Assuming the proxy responds with a 200 connection established
      if (
        chunkStr.toLowerCase().includes("connection established") ||
        chunkStr.toLowerCase().includes("ok") ||
        chunkStr.toLowerCase().includes("200")
      ) {
        clientSocket.write(
          "HTTP/1.1 200 Connection Established\r\nProxy-agent: Genius Proxy\r\n\r\n"
        );
        proxySocket.write(head);
        proxySocket.pipe(clientSocket);
        clientSocket.pipe(proxySocket);
      } else {
        const responseMessage = "Internal Server Error.";
        const responseHeaders = [
          "HTTP/1.1 500 Internal Server Error",
          "Content-Type: text/plain",
          `Content-Length: ${Buffer.byteLength(responseMessage)}`,
          "Connection: close",
          "\r\n",
        ].join("\r\n");
        clientSocket.end(`${responseHeaders}${responseMessage}`);
      }
    });
  });

  proxySocket.on("close", () => {
    delete establishedConnections[targetHostPort];
    console.log("proxySocket closed");
  });

  proxySocket.on("drain", () => {
    console.log("proxySocket drain");
  });

  proxySocket.on("timeout", () => {
    delete establishedConnections[targetHostPort];
    console.log("proxySocket timeout");
  });

  proxySocket.on("error", (err) => {
    console.error("Proxy socket error:", err);
    delete establishedConnections[targetHostPort];
    const responseMessage = "Internal Proxy Server Error.";
    const responseHeaders = [
      "HTTP/1.1 500 Internal Server Error",
      "Content-Type: text/plain",
      `Content-Length: ${Buffer.byteLength(responseMessage)}`,
      "Connection: close",
      "\r\n",
    ].join("\r\n");
    clientSocket.end(`${responseHeaders}${responseMessage}`);
  });
};

process.on('uncaughtException', function (err) {
  console.log('Proxy Server uncaught Error', err.stack);
});