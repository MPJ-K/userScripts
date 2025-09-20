// Create (or reuse) a global namespace to hold all helpers.
window.MpjHelpers = window.MpjHelpers || {};

// Add a subsection to the namespace for the helpers defined in this file.
window.MpjHelpers.Logging = {};


/**
 * Helper class for logging messages to the console.
 */
window.MpjHelpers.Logging.Logger = class Logger {
    /**
     * All valid log levels in ascending order of verbosity.
     */
    static logLevels = ["disabled", "error", "warn", "info", "debug"];


    /**
     * Create a Logger.
     * @param {string} [logLevel="info"] - The initial log level. Valid levels are: `disabled`, `error`, `warn`, `info`, and `debug`. Defaults to `info` if not specified or `disabled` if invalid.
     * @param {string} [prefix=undefined] - An optional prefix to apply to all log messages sent via this Logger. Defaults to `undefined`.
     */
    constructor(logLevel = "info", prefix = undefined) {
        this.prefix = prefix;
        this.setLogLevel(logLevel);
    }


    /**
     * Apply this Logger's prefix to the given message. If no prefix is set, return the message as is.
     * The prefix may be extended by specifying `extraPrefixes`.
     * @param {*[]} message - The message to prefix.
     * @param {...any} extraPrefixes - Optional extra prefixes to insert between `this.prefix` and the message.
     * @returns {*[]} The prefixed message.
     */
    #applyPrefix(message, ...extraPrefixes) {
        return this.prefix ? [this.prefix, ...extraPrefixes, ...message] : [...extraPrefixes, ...message];
    }


    /**
     * Set the log level.
     * @param {string} logLevel - The new log level. Valid levels are: `disabled`, `error`, `warn`, `info`, and `debug`. Defaults to `disabled` if invalid.
     */
    setLogLevel(logLevel) {
        this.logLevel = Logger.logLevels.indexOf(logLevel);

        if (this.logLevel < 0) {
            console.error(this.#applyPrefix([`Log level '${logLevel}' is invalid! Logging has been disabled.`]));
        }
    }


    /**
     * Output a message to the console at the `debug` (verbose) log level, if permitted by this Logger's log level.
     * @param {...any} message - A list of JavaScript values to output.
     */
    debug(...message) {
        if (this.logLevel < 4) { return; }
        console.debug(this.#applyPrefix(message, "[V]"));
    }


    /**
     * Output a message to the console at the `info` log level, if permitted by this Logger's log level.
     * @param {...any} message - A list of JavaScript values to output.
     */
    info(...message) {
        if (this.logLevel < 3) { return; }
        console.info(this.#applyPrefix(message));
    }


    /**
     * Output a message to the console at the `log` (info) log level, if permitted by this Logger's log level.
     * This method is equivalent to `Logger.info()` on most platforms.
     * @param {...any} message - A list of JavaScript values to output.
     */
    log(...message) {
        if (this.logLevel < 3) { return; }
        console.log(this.#applyPrefix(message));
    }


    /**
     * Output a message to the console at the `warn` log level, if permitted by this Logger's log level.
     * @param {...any} message - A list of JavaScript values to output.
     */
    warn(...message) {
        if (this.logLevel < 2) { return; }
        console.warn(this.#applyPrefix(message));
    }


    /**
     * Output a message to the console at the `error` log level, if permitted by this Logger's log level.
     * @param {...any} message - A list of JavaScript values to output.
     */
    error(...message) {
        if (this.logLevel < 1) { return; }
        console.error(this.#applyPrefix(message));
    }
};
