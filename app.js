const express = require("express");
const socketio = require("socket.io");
const http = require("http");
const path = require("path");
const app = express();

const server = http.createServer(app);
const io = socketio(server);

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

const users = {}; // Track connected users

io.on("connection", (socket) => {
  console.log("Socket io Connected");

  // Store user upon joining
  socket.on("join", ({ username }) => {
    users[socket.id] = { username };
    io.emit("user-joined", { id: socket.id, username });
  });

  socket.on("send location", (data) => {
    // Only emit location if user has joined
    if (users[socket.id]) {
      io.emit("receive-location", { id: socket.id, ...data, username: users[socket.id].username });
    } else {
      console.warn(`User with socket ID ${socket.id} sent location without joining.`);
    }
  });

  socket.on("send-message", (message) => {
    if (users[socket.id]) {
      io.emit("receive-message", { id: socket.id, message, username: users[socket.id].username });
    } else {
      console.warn(`User with socket ID ${socket.id} tried to send message without joining.`);
    }
  });

  socket.on("disconnect", () => {
    io.emit("user-disconnected", socket.id);
    delete users[socket.id];
  });
});


app.get("/", (req, res) => {
  res.render("index");
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
