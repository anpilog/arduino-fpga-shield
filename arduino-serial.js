var slip        = require('node-slip')
var log         = require('node-logging')
var SerialPort  = require('serialport').SerialPort;

log.setLevel('debug');

var CMD_SPI_MODE      = 0x10 // [mode][bit order][speed prescaler]       || no payload                              ||
var CMD_SPI_REQUEST   = 0x11 // {data}                                   || {data}                                  ||
//---------------------------//------------------------------------------||-----------------------------------------||
var CMD_PIN_MODE      = 0x12 // [pin][mode]                              || no payload                              ||
var CMD_PIN_WRITE     = 0x13 // [pin][value]                             || no payload                              ||
//  -------------------------//-------------------------------------------------------------------------------------||
var CMD_WRITE_ENABLE  = 0x80 // no payload                               || no payload                              ||
var CMD_WRITE_DISABLE = 0x81 // no payload                               || no payload                              ||
var CMD_READ_STATUS   = 0x82 // no payload                               || [status byte]                           ||
var CMD_WRITE_STATUS  = 0x83 // [status byte]                            || no payload                              ||
var CMD_READ_DATA     = 0x84 // [A23-A16][A15-A8][A7-A0][length]         || [A23-A16][A15-A8][A7-A0]{data}          ||
var CMD_FAST_READ     = 0x85 // [A23-A16][A15-A8][A7-A0][length]         || [A23-A16][A15-A8][A7-A0]{data}          ||
var CMD_PAGE_PROGRAM  = 0x86 // [A23-A16][A15-A8][A7-A0][validate]{data} || [A23-A16][A15-A8][A7-A0][result]        ||
var CMD_BLOCK_ERASE   = 0x87 // [A23-A16][A15-A8][A7-A0]                 || no payload                              ||
var CMD_SECTOR_ERASE  = 0x88 // [A23-A16][A15-A8][A7-A0]                 || no payload                              ||
var CMD_CHIP_ERASE    = 0x89 // no payload                               || no payload                              ||
var CMD_POWER_DOWN    = 0x8A // no payload                               || no payload                              ||
var CMD_DEVICE_ID     = 0x8B // no payload                               || [device id]                             ||
var CMD_MANUF_ID      = 0x8C // no payload                               || [manufacture id]                        ||
var CMD_JEDEC_ID      = 0x8D // no payload                               || [manufacture id][memory type][capacity] ||

(function Arduino(serialport)
{
  var self = this;

  self.serial = new SerialPort(process.argv[2], {
    baudrate: 115200,
    buffersize: 1
  });

  self.serial.on('data', function(data) {
    if (self.connected)
      {
        console.log('SERIAL RECEIVED: ' + data);
      }
  });

  self.serial.on('open', function() {
    console.log('SERIAL OPEN');
    on();
  });

  function onData(msg) {
    self.process(msg)
  };

  function onFraming(msg) {
    log.error('SLIP framing error!');
  };

  function onEscape(msg) {
    log.error('SLIP escape error!');
  };

  this.parser = new slip.parser({
    data    : onData,
    framing : onFraming,
    escape  : onEscape
  }, false);

  function setCallback(cmd, callback)
  {
    this.ackCmd = cmd;
    this.callback = callback;
  }

  self.process = function(msg)
  {
    if (this.callback)
    {
      if (msg[0] == this.ackCmd)
      {
          callback(false, msg.slice[1]);
      }
      else
      {
        callback(true, msg.slice[1]);
      }
    }
  };

  self.spiMode = function(mode, order, prescaler, callback)
  {
    this.serial.write(slip.generator(new Buffer([CMD_SPI_MODE, mode, order, prescaler)));
    setCallback(CMD_SPI_MODE, callback);
  };

  self.spiRequest = function(data, callback)
  {
    var buf = new Buffer(data.length + 1)
    buf[0] = CMD_SPI_REQUEST;
    data.copy(buf, 1)
    this.serial.write(slip.generator(buf));
    setCallback(CMD_SPI_REQUEST, callback);
  };

  self.deviceId = function(callback)
  {
    this.serial.write(slip.generator(new Buffer([CMD_DEVICE_ID])));
    setCallback(CMD_DEVICE_ID, function(err, msg) {
      if (err)
        callback(true);
      else
        callback(false, msg[0]);
    });
  };

  self.manufactureId = function(callback)
  {
    this.serial.write(slip.generator(new Buffer([CMD_MANUF_ID])));
    setCallback(CMD_MANUF_ID, function(err, msg) {
      if (err)
        callback(true);
      else
        callback(false, msg[0]);
    });
  };

  self.jdecId = function(callback)
  {
    this.serial.write(slip.generator(new Buffer([CMD_JEDEC_ID])));
    setCallback(CMD_JEDEC_ID, function(err, msg) {
      if (err)
        callback(true);
      else
        callback(false, msg[0], msg[1], msg[2]);
    });
  };

  self.chipErase = function(callback)
  {
    this.serial.write(slip.generator(new Buffer([CMD_CHIP_ERASE])));
    setCallback(CMD_CHIP_ERASE, callback);
  };

  self.writeStatus = function(status, callback)
  {
    this.serial.write(slip.generator(new Buffer([CMD_WRITE_STATUS, status])));
    setCallback(CMD_WRITE_STATUS, callback);
  };

  self.readStatus = function(callback)
  {
    this.serial.write(slip.generator(new Buffer([CMD_READ_STATUS])));
    setCallback(CMD_READ_STATUS, function(err, msg) {
      callback(err, msg[0]);
    });
  };

  self.writeEnable = function(callback)
  {
    this.serial.write(slip.generator(new Buffer([CMD_WRITE_ENABLE])));
    setCallback(CMD_WRITE_ENABLE, callback);
  };

  self.writeDisable = function(callback)
  {
    this.serial.write(slip.generator(new Buffer([CMD_WRITE_DISABLE])));
    setCallback(CMD_WRITE_DISABLE, callback);
  };
})
