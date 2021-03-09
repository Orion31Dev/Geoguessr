const express = require('express');
const app = express();

const path = require("path");
require("dotenv").config();

var http = require('http').createServer(app);
http.listen(process.env.PORT || 8080);

const dist = path.resolve(__dirname, "../dist");

app.use(express.static(dist));

app.get('*', (_req: any, res: any) => {
  res.sendFile('./index.html', { root: dist });
});
