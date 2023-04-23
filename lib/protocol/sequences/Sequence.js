var EventEmitter = require("events").EventEmitter;
var Packets = require("../packets");
var ErrorConstants = require("../constants/errors");
var Timer = require("../Timer");

var LONG_STACK_DELIMITER = "\n    --------------------\n";

module.exports = Sequence;
class Sequence extends EventEmitter {
  constructor(options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    }

    super();

    options = options || {};

    this._callback = callback;
    this._callSite = null;
    this._ended = false;
    this._timeout = options.timeout;
    this._timer = new Timer(this);
  }

  // istanbul ignore next: Node.js < 0.10 not covered
  static listenerCount =
    EventEmitter.listenerCount ||
    function (emitter, type) {
      return emitter.listeners(type).length;
    };

  static determinePacket(byte) {
    switch (byte) {
      case 0x00:
        return Packets.OkPacket;
      case 0xfe:
        return Packets.EofPacket;
      case 0xff:
        return Packets.ErrorPacket;
      default:
        return undefined;
    }
  }

  hasErrorHandler() {
    return Boolean(this._callback) || this.listenerCount("error") > 1;
  }

  _packetToError(packet) {
    const code = ErrorConstants[packet.errno] || "UNKNOWN_CODE_PLEASE_REPORT";
    const err = new Error(code + ": " + packet.message);
    err.code = code;
    err.errno = packet.errno;

    err.sqlMessage = packet.message;
    err.sqlState = packet.sqlState;

    return err;
  }

  end(err) {
    if (this._ended) {
      return;
    }

    this._ended = true;

    if (err) {
      this._addLongStackTrace(err);
    }

    // Without this we are leaking memory. This problem was introduced in
    // 8189925374e7ce3819bbe88b64c7b15abac96b16. I suspect that the error object
    // causes a cyclic reference that the GC does not detect properly, but I was
    // unable to produce a standalone version of this leak. This would be a great
    // challenge for somebody interested in difficult problems : )!
    this._callSite = null;

    // try...finally for exception safety
    try {
      if (err) {
        this.emit("error", err);
      }
    } finally {
      try {
        if (this._callback) {
          this._callback.apply(this, arguments);
        }
      } finally {
        this.emit("end");
      }
    }
  }

  OkPacket(packet) {
    this.end(null, packet);
  }

  ErrorPacket(packet) {
    this.end(this._packetToError(packet));
  }

  // Implemented by child classes
  start() {}

  _addLongStackTrace(err) {
    const callSiteStack = this._callSite && this._callSite.stack;

    if (!callSiteStack || typeof callSiteStack !== "string") {
      // No recorded call site
      return;
    }

    if (err.stack.indexOf(LONG_STACK_DELIMITER) !== -1) {
      // Error stack already looks long
      return;
    }

    const index = callSiteStack.indexOf("\n");

    if (index !== -1) {
      // Append recorded call site
      err.stack += LONG_STACK_DELIMITER + callSiteStack.substr(index + 1);
    }
  }

  _onTimeout() {
    this.emit("timeout");
  }
}
