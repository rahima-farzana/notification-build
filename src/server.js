const express = require('express');
const client = require('prom-client');
const favicon = require('serve-favicon');
const path = require('path');
const utils = require('./utils');


// fn to create express server
const create = async () => {

    // server
    const app = express();
    app.use(favicon(path.join(__dirname, '../public', 'favicon.ico')));
    
    // Log request
    app.use(utils.appLogger);

    // root route - serve static file
    app.get('/api/hello', (req, res) => {
        res.json({hello: 'goodbye'});
        res.end();
    });

    // liveness check
    app.get('/live', (req, res) => {
        res.status(200).json({ status: 'ok' });
    });

    // readiness check
    app.get('/ready', async (req, res) => {
     try {
        res.status(200).json({ status: 'ready' });
     } catch (error) {
	res.status(503).json({ status: 'not ready', error: error.message });
     }
    });

    client.collectDefaultMetrics();
    app.get('/metrics', async (req, res) => {
      res.set("Content-Type", client.register.contentType);
      res.end(await client.register.metrics());
    });

    // root route - serve static file
    app.get('/', (req, res) => {
        return res.sendFile(path.join(__dirname, '../public/client.html'));

    });

    // Catch errors
    app.use(utils.logErrors);
    app.use(utils.clientError404Handler);
    app.use(utils.clientError500Handler);
    app.use(utils.errorHandler);

    return app;
};

module.exports = {
    create
};
