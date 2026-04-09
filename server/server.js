// server/server.js

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

/*
  Socket.IO configuration
  - CORS enabled
  - WebSocket + polling support
  - Increased buffer size for file transfer
  - Stable ping settings for cloud hosting
*/

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },

  transports: ["websocket", "polling"],

  // Allow larger transfers (100 MB safe)
  maxHttpBufferSize: 20 * 1024 * 1024,

  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true

});

/*
  Client connection handler
*/

io.on("connection", (socket) => {

  console.log("Connected:", socket.id);
  console.log("Total clients:", io.engine.clientsCount);

  /*
    Debug: log every event
  */

  socket.onAny((event) => {
    console.log("Event:", event);
  });

  /*
    Memory monitor (debug)
  */

  const memInterval = setInterval(() => {
    const used = process.memoryUsage();

    console.log(
      "Memory MB:",
      Math.round(used.heapUsed / 1024 / 1024)
    );

  }, 10000);

  /*
    Cleanup when client disconnects
  */

  socket.on("disconnect", (reason) => {

    console.log("Disconnected:", socket.id);
    console.log("Reason:", reason);
    console.log("Total clients:", io.engine.clientsCount);

    clearInterval(memInterval);

  });

});

  /*
    File transfer CHUNK
    Relay chunk to all other clients
  */
  socket.on("file:chunk", (chunk) => {
    socket.broadcast.emit("file:chunk", chunk);
  });

  /*
    Chat message relay
  */
  socket.on("chat message", (msg) => {
    socket.broadcast.emit("chat message", msg);
  });

  /*
    Client disconnect handler
  */
  socket.on("disconnect", (reason) => {
    console.log("Disconnected:", socket.id);
    console.log("Reason:", reason);
    console.log("Total clients:", io.engine.clientsCount);
  });



/*
  Health check endpoint
  Required for hosting platforms
*/

app.get("/", (req, res) => {
  res.send("Server is running");
});

/*
  Environment-based port
  Works locally and on hosting
*/

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server on port", PORT);
});