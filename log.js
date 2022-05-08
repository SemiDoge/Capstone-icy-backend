/* eslint-disable require-jsdoc */
// This file defines functionality of the Google Cloud Bunyan SDK for logging.

const bunyan = require('bunyan');

const {LoggingBunyan} = require('@google-cloud/logging-bunyan');

const loggingBunyan = new LoggingBunyan();

class Log {
  constructor() {
    this.logger = bunyan.createLogger({
      name: 'icy-backend',
      streams: [
        // Log to the console at 'info' and above
        {stream: process.stdout, level: 'info'},
        // And log to Cloud Logging, logging at 'info' and above
        loggingBunyan.stream('info'),
      ],
    });
  }

  // Returns the current time as a timestamp string
  // in the format: YYYY-mm-DD[HH:MM:SS]
  getTimestamp() {
    const currentDate = new Date();
    return currentDate.getFullYear() +
      '-' + ('0' + (currentDate.getMonth() + 1)).slice(-2) +
      '-' + currentDate.getDate() +
      '[' +
      ('0' + currentDate.getHours()).slice(-2) +
      ':' + ('0' + currentDate.getMinutes()).slice(-2) +
      ':' + ( '0' + currentDate.getSeconds()).slice(-2) +
      ']';
  }

  logResponse(ipAddr, responseCode, message) {
    this.logger.info('[' + ipAddr + ']' + '(' + responseCode + ')' + message);
  }
}

module.exports = {Log};
