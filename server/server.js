// server/server.js

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },

  transports: ["websocket", "polling"],

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
    Memory monitor
  */

  const memInterval = setInterval(() => {
    const used = process.memoryUsage();

    console.log(
      "Memory MB:",
      Math.round(used.heapUsed / 1024 / 1024)
    );

  }, 10000);

  /*
    FILE START
  */

  socket.on("file:start", (meta) => {
    socket.broadcast.emit("file:start", meta);
  });

  /*
    FILE CHUNK
  */

  socket.on("file:chunk", (chunk) => {
    socket.broadcast.emit("file:chunk", chunk);
  });

  /*
    CHAT MESSAGE
  */

  socket.on("chat message", (msg) => {
    socket.broadcast.emit("chat message", msg);
  });

  /*
    DISCONNECT
  */

  socket.on("disconnect", (reason) => {

    console.log("Disconnected:", socket.id);
    console.log("Reason:", reason);
    console.log("Total clients:", io.engine.clientsCount);

    clearInterval(memInterval);

  });

});

/*
  Health check endpoint
*/

app.get("/", (req, res) => {
  res.send("Server is running");
});

/*
  Start server
*/

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server on port", PORT);
});