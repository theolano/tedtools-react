/* eslint consistent-return:0 */
const express = require('express');
const axios = require('axios');
const logger = require('./logger');
require('dotenv').config();

const argv = require('./argv');
const port = require('./port');
const setup = require('./middlewares/frontendMiddleware');
const isDev = process.env.NODE_ENV !== 'production';
const ngrok = (isDev && process.env.ENABLE_TUNNEL) || argv.tunnel ? require('ngrok') : false;
const resolve = require('path').resolve;
const app = express();
var service;
var sessionId;

app.use(express.json());

// If you need a backend, e.g. an API, add your custom backend-specific middleware here
// app.use('/api', myApi);

// *****************************************************************************
// API - Create Watson Assistant Session
// *****************************************************************************
app.post('/api/watson/assistant/startSession', (req, res) => {
  var watson = require('watson-developer-cloud');

  service = new watson.AssistantV2({
    iam_apikey: process.env.WATSON_API_KEY,
    version: process.env.WATSON_ASSISTANT_VERSION
  });

  service.createSession({
    assistant_id: process.env.WATSON_ASSISTANT_ID,
  }, function(err, response) {
    if (err) {
      console.error(err);
    } else{
      res.send(JSON.stringify(response));
    }
  });
});

// *****************************************************************************
// API - Send Message to Watson Assistant
// *****************************************************************************
app.post('/api/watson/assistant/sendMessage', (req, res) => {
  console.log('/api/watson/assistant/sendMessage req.body', req.body);
  axios.defaults.withCredentials = true;

  service.message({
    assistant_id: process.env.WATSON_ASSISTANT_ID,
    session_id: req.body.session_id,
    input: {
      message_type: 'text',
      text: req.body.text,
    },
  }, (err, resp) => {
    if (err) {
      console.log('error:', err);
    } else {
      res.send(JSON.stringify(resp));
    }
  });
  // console.log('/api/message res', res);

  // axios
  // .post(`${process.env.WATSON_ASSISTANT_BASE_URL}/v1/workspaces/${process.env.WATSON_WORKSPACE_ID}/message?version=${process.env.WATSON_ASSISTANT_VERSION}`,
  //   req.body, {
  //     headers: {
  //       'Content-Type': 'application/json',
  //     },
  //     auth: {
  //       username: process.env.WATSON_ASSISTANT_USERNAME,
  //       password: process.env.WATSON_API_KEY,
  //     },
  //   }).then(response => {
  //     // console.log("/api/message response.data", response.data);
  //     sessionId = response.data.sessionId;
  //     res.send(JSON.stringify(response.data));
  //   }).catch(err => {
  //     console.log('Error:', err);
  //   });

});



// In production we need to pass these values in instead of relying on webpack
setup(app, {
  outputPath: resolve(process.cwd(), 'build'),
  publicPath: '/',
});

// get the intended host and port number, use localhost and port 3000 if not provided
const customHost = argv.host || process.env.HOST;
const host = customHost || null; // Let http.Server use its default IPv6/4 host
const prettyHost = customHost || 'localhost';


// Start your app.
app.listen(port, host, err => {
  if (err) {
    return logger.error(err.message);
  }

  // Connect to ngrok in dev mode
  if (ngrok) {
    ngrok.connect(port, (innerErr, url) => {
      if (innerErr) {
        return logger.error(innerErr);
      }

      logger.appStarted(port, prettyHost, url);
    });
  } else {
    logger.appStarted(port, prettyHost);
  }
});
