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
  - 1 MB max message size (safe for chunk transfer)
*/

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ["websocket", "polling"],
  maxHttpBufferSize: 1e6 // 1 MB
});

/*
  Client connection handler
*/

io.on("connection", (socket) => {

  console.log("Connected:", socket.id);
  console.log("Total clients:", io.engine.clientsCount);

  /*
    File chunk relay
    Receive → Broadcast → Discard
  */

  socket.on("file-chunk", (data) => {
    socket.broadcast.emit("file-chunk", data);
  });

  /*
    Transfer metadata relay
  */

  socket.on("file-meta", (meta) => {
    socket.broadcast.emit("file-meta", meta);
  });

  /*
    Transfer completion relay
  */

  socket.on("file-complete", () => {
    socket.broadcast.emit("file-complete");
  });

  /*
    Client disconnect handler
  */

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
    console.log("Total clients:", io.engine.clientsCount);
  });

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