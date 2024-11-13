import http from "http";
import net from "net";
import { URL } from "url";
import "dotenv/config";
import { config } from "dotenv";

config({
  path: [`.env.${process.env.PROXY_TYPE}.${process.env.NODE_ENV}`, ".env"],
});

// Define your username and password
const USERNAME = process.env.BASIC_AUTH_USERNAME;
const PASSWORD = process.env.BASIC_AUTH_PASSWORD;
const PORT = process.env.PORT || Number(process.env.LOCAL_PORT);

const PROXY_USERNAME = process.env.PROXY_USERNAME;
const PROXY_PASSWORD = process.env.PROXY_PASSWORD;

const proxyHosts = Object.entries(process.env).reduce((acc, [key, host]) => {
  if (key.trim().startsWith("PROXY_HOST_")) {
    acc.push(`http://${PROXY_USERNAME}:${PROXY_PASSWORD}@${host}`);
  }
  return acc;
}, []);

const establishedConnections = {};

function* nextProxyUrlStr() {
  const hosts = proxyHosts;
  let index = 0;
  while (true) {
    yield hosts[index];
    index = (index + 1) % hosts.length
  }
}

const iterator = nextProxyUrlStr();


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
  console.log("Forward proxy server running on port " + process.env.LOCAL_PORT);
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

  const proxyUrlStr = iterator.next().value;
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
    if (err.code === "EPIPE") {
      console.error("EPIPE error: attempted to write to a closed socket");
      clientSocket.end();
    } else if (err.code === "ECONNABORTED") {
      console.error("ECONNABORTED error: connection aborted");
      clientSocket.end();
    } else if (err.code === "ECONNRESET") {
      console.error("ECONNRESET error: connection reset by peer");
      clientSocket.end();
    } else {
      console.error("Socket error:", err);
      clientSocket.end();
    }
  });
});

server.on("error", (error) => {
  console.log("Proxy Server error:", error);
});

/**
 * Handles an established connection between the client and the forward proxy.
 *
 * @param {net.Socket} clientSocket - The client socket.
 * @param {URL} forwardProxyUrl - The URL of the forward proxy.
 * @param {string} targetHostPort - The target host and port.
 * @param {string} proxyConnectRequest - The CONNECT request with Basic Auth to the forward proxy.
 * @param {Buffer} head - The head of the client socket.
 */
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
        console.log("connection established: ", targetHostPort);
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
    clientSocket.end();
    delete establishedConnections[targetHostPort];
    // console.log("proxySocket closed");
  });

  proxySocket.on("drain", () => {
    console.log("proxySocket drain");
  });

  proxySocket.on("timeout", () => {
    clientSocket.end();
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

process.on("uncaughtException", function (err) {
  console.log("Proxy Server uncaught Error", err.stack);
});
