// const io = require("socket.io")(8000, { cors: { origin: "*" } });
const express = require("express");
const { createServer } = require('node:http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" }, connectionStateRecovery: {} });

let totalVoting = 0;

let votingPolls = {
  "I'am crazy.": 0,
  "I'm good person.": 0,
};



app.get('/', (req, res) => {
  res.send('<h1>Hello world</h1>');
});

io.on("connection", socket => {
  console.log('a user connected');

  socket.emit("update", { totalVoting, votingPolls });
  socket.on("send-vote", (vote) => {
    totalVoting++;
    votingPolls[vote]++;
    console.log(vote);
    socket.broadcast.emit("receive-vote", { totalVoting, votingPolls });
    io.emit("update", { totalVoting, votingPolls });
  });
});

server.listen(8000, () => {
  console.log('server running at http://localhost:8000');
});
