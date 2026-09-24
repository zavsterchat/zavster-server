const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.get('/', (req, res) => {
  res.send('ZavsterChat signaling server is running.');
});

let waitingUsers = [];

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('find-partner', () => {
    waitingUsers = waitingUsers.filter(id => id !== socket.id);

    if (waitingUsers.length > 0) {
      const partnerId = waitingUsers.shift();
      const partnerSocket = io.sockets.sockets.get(partnerId);

      if (partnerSocket) {
        socket.emit('partner-found', { partnerId, initiator: true });
        partnerSocket.emit('partner-found', { partnerId: socket.id, initiator: false });
        console.log(`Paired ${socket.id} with ${partnerId}`);
      } else {
        waitingUsers.push(socket.id);
      }
    } else {
      waitingUsers.push(socket.id);
      socket.emit('waiting');
      console.log(`${socket.id} is waiting. Queue size: ${waitingUsers.length}`);
    }
  });

  socket.on('signal', ({ to, signal }) => {
    io.to(to).emit('signal', { from: socket.id, signal });
  });

  socket.on('leave-partner', ({ partnerId }) => {
    if (partnerId) {
      io.to(partnerId).emit('partner-left');
    }
    waitingUsers = waitingUsers.filter(id => id !== socket.id);
  });

  socket.on('disconnect', () => {
    waitingUsers = waitingUsers.filter(id => id !== socket.id);
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
