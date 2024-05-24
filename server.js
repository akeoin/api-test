const streamConnection = require('./streamconnection');
const { test } = require('./runner');

streamConnection.setTestFunction(test);

const port = 5002;
streamConnection.startServer(port, () => {
  console.log(`Streaming server is running on port ${port}`);
});
