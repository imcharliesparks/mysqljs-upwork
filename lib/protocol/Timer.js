var Timers = require("timers");

module.exports = Timer;
class Timer {
  constructor(object) {
    this._object = object;
    this._timeout = null;
  }

  active() {
    if (this._timeout) {
      if (this._timeout.refresh) {
        this._timeout.refresh();
      } else {
        Timers.active(this._timeout);
      }
    }
  }

  start(msecs) {
    this.stop();
    this._timeout = Timers.setTimeout(this._onTimeout.bind(this), msecs);
  }

  stop() {
    if (this._timeout) {
      Timers.clearTimeout(this._timeout);
      this._timeout = null;
    }
  }

  _onTimeout() {
    return this._object._onTimeout();
  }
}
