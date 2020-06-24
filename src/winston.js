const winston = require("winston");
const GCPLogging = require("@google-cloud/logging-winston");

const { transports, format } = winston;

const defaultFormat = format.combine(format.timestamp(), format.json());

const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp(),
  format.printf((info) => {
    const time = info.timestamp.split("T")[1].slice(0, 8);

    if (info.httpRequest)
      info.message =
        info.httpRequest.requestMethod.padEnd(8, " ") +
        info.httpRequest.requestUrl;

    return `\u001b[7m\u001b[37m[${time}] \u001b[0m${
      info.level + " \t" + info.message
    }`;
  })
);

const logSeverityLevels = {
  emergency: 0,
  alert: 1,
  critical: 2,
  error: 3,
  warning: 4,
  notice: 5,
  info: 6,
  debug: 7,
};

const inverseColours = {
  emergency: "magenta bold inverse",
  alert: "magenta inverse",
  critical: "red bold inverse",
  error: "red inverse",
  warning: "yellow inverse",
  notice: "green inverse",
  info: "cyan inverse",
  debug: "blue inverse",
};

function setup() {
  winston.addColors(inverseColours);

  winston.loggers.add("custom", {
    levels: logSeverityLevels,
    transports: [
      makeConsoleTransport("debug"),
      makeStackdriverTransport("info"),
    ],
  });

  getLogger().debug("Logger configuration complete.");
}

function makeConsoleTransport(level, format) {
  return new transports.Console({
    levels: logSeverityLevels,
    level: level,
    format: format ? format : consoleFormat,
  });
}

function makeStackdriverTransport(level) {
  return new GCPLogging.LoggingWinston({
    levels: logSeverityLevels,
    level,
    format: defaultFormat,
  });
}

async function makeRequestLoggingMiddleware() {
  return await GCPLogging.express.makeMiddleware(
    getLogger(),
    makeStackdriverTransport("info")
  );
}

function getLogger() {
  return winston.loggers.get("custom");
}

module.exports = { setup, getLogger, makeRequestLoggingMiddleware };
