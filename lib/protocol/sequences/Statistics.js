var Sequence = require("./Sequence");
const Packets = require("../packets");

module.exports = Statistics;
class Statistics extends Sequence {
  constructor(options, callback) {
    if (!callback && typeof options === "function") {
      callback = options;
      options = {};
    }

    super(options, callback);
  }

  start() {
    this.emit("packet", new Packets.ComStatisticsPacket());
  }

  StatisticsPacket(packet) {
    this.end(null, packet);
  }

  determinePacket(firstByte) {
    if (firstByte === 0x55) {
      return Packets.StatisticsPacket;
    }

    return undefined;
  }
}
