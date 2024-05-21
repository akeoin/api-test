const express = require('express');
const cors = require('cors');
const EventEmitter = require('events');

class StreamConnection extends EventEmitter {
  constructor() {
    super();
    this.clients = [];
    this.cache = []; // Cache to store sent data
    this.startServer();
  }

  startServer() {
    const app = express();
    app.use(cors());

    app.get('/events', (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
      console.log("Client connected to event stream");

      // Send cached data to the new client
      this.cache.forEach(data => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      });

      this.clients.push(res);

      req.on('close', () => {
        this.clients = this.clients.filter(client => client !== res);
      });
    });

    const port = 5002;
    app.listen(port, () => {
      console.log(`Streaming server is running on port ${port}`);
    });
  }

  sendData(data) {
    // Add data to cache
    this.cache.push(data);

    // Send data to all clients
    this.clients.forEach(client => client.write(`data: ${JSON.stringify(data)}\n\n`));
  }
}

module.exports = new StreamConnection();
