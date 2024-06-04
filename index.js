const io = require("socket.io")(8000, { cors: { origin: "*" } });

let totalVoting = 0;

let votingPolls = {
  "I'am crazy.": 0,
  "I'm good person.": 0,
};

io.on("connection", socket => {
  socket.emit("update", { totalVoting, votingPolls });
  socket.on("send-vote", (vote) => {
    totalVoting++;
    votingPolls[vote]++;
    console.log(vote);
    socket.broadcast.emit("receive-vote", { totalVoting, votingPolls });
    io.emit("update", { totalVoting, votingPolls });
  });
});
