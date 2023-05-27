const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const port = process.env.PORT || 3000;

const state = {
  drawing: true,
  trails: true,
  eraser: {
    speed: 1,
    active: false,
  },
};

// trails
const clients = {};
const getAllClientIds = () => Object.keys(clients);

app.use(express.static(__dirname + "/public"));

function onConnection(socket) {
  // trails
  const url = socket.handshake.headers.referer;
  const id = url.split("/").pop();
  console.log(id);
  const { query } = socket.handshake;
  const { clientType, script } = query;

  if (id !== "visualiser.html" || id !== "server.html") {
    clients[socket.id] = socket;
  }
  socket.emit("state", state);
  console.log(`Client connected, total clients: ${getAllClientIds().length}`);

  socket.on("draw", (data) => {
    getAllClientIds().forEach((clientId) => {
      clients[clientId].emit("draw", data);
    });
  });

  getAllClientIds().forEach((clientId) => {
    clients[clientId].emit(`new_client`, getAllClientIds());
  });

  socket.on("disconnect", () => {
    delete clients[socket.id];
    console.log(
      `Client disconnected, total clients: ${getAllClientIds().length}`
    );
  });

  socket.on("startRecording", (seconds) => {
    getAllClientIds().forEach((clientId) => {
      clients[clientId].emit(`startRecording`, seconds);
    });
  });
  socket.on("stopRecording", () => {
    getAllClientIds().forEach((clientId) => {
      clients[clientId].emit(`stopRecording`);
    });
  });
  socket.on("playRecording", () => {
    getAllClientIds().forEach((clientId) => {
      clients[clientId].emit(`playRecording`);
    });
  });
  socket.on("toggleTrails", () => {
    getAllClientIds().forEach((clientId) => {
      clients[clientId].emit(`toggleTrails`);
    });
  });
  socket.on("draw_end", () => {
    getAllClientIds().forEach((clientId) => {
      clients[clientId].emit(`draw_end`, clientId);
    });
  });

  // whiteboard
  socket.on("drawing", (data) => socket.broadcast.emit("drawing", data));
  socket.on("changeAdminColor", (data) =>
    socket.broadcast.emit("changeAdminColor", data)
  );
  socket.on("changeUserColor", (data) =>
    socket.broadcast.emit("changeUserColor", data)
  );
  socket.on("changeLineWidth", (data) =>
    socket.broadcast.emit("changeLineWidth", data)
  );
  socket.on("save", (data) => socket.broadcast.emit("save"));
  socket.on("loadCanvas", (data) => socket.broadcast.emit("loadCanvas", data));
  socket.on("clear", () => socket.broadcast.emit("clear"));

  // whiteboard animations
  socket.on("toggleRotate", () => socket.broadcast.emit("toggleRotate"));
  socket.on("toggleZoom", () => socket.broadcast.emit("toggleZoom"));
  socket.on("toggleDrawing", () => socket.broadcast.emit("toggleDrawing"));
  socket.on("changeAnimationSpeed", (speed) =>
    socket.broadcast.emit("changeAnimationSpeed", speed)
  );
  socket.on("toggleEraser", (seconds) => {
    state.eraser.active = !state.eraser.active;
    state.eraser.speed = seconds;
    socket.broadcast.emit("toggleEraser", seconds);
  });
}

io.on("connection", onConnection);

http.listen(port, () => console.log("listening on port " + port));
