const express = require('express');
const routes = require('./routes');
const notFoundHandler = require('./middleware/notFoundHandler');
const errorHandler = require('./middleware/errorHandler');

const BODY_LIMIT = '100kb';

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ extended: false, limit: BODY_LIMIT }));
app.use(routes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
