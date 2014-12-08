var slip        = require('node-slip')
var log         = require('node-logging')
var SerialPort  = require('serialport').SerialPort;
var Emmiter     = require("events").EventEmitter;

log.setLevel('debug');

//---------------------------//------------------------------------------||-----------------------------------------||
var CMD_DEBUG         = 0x00 // {debug message}                          || {debug message}                         ||
var CMD_ECHO          = 0x03 // no payload                               || no payload                              ||
//---------------------------//------------------------------------------||-----------------------------------------||
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
var CMD_PAGE_PROGRAM  = 0x86 // [A23-A16][A15-A8][A7-A0]{data}           || [A23-A16][A15-A8][A7-A0][result]        ||
var CMD_BLOCK_ERASE   = 0x87 // [A23-A16][A15-A8][A7-A0]                 || no payload                              ||
var CMD_SECTOR_ERASE  = 0x88 // [A23-A16][A15-A8][A7-A0]                 || no payload                              ||
var CMD_CHIP_ERASE    = 0x89 // no payload                               || no payload                              ||
var CMD_POWER_DOWN    = 0x8A // no payload                               || no payload                              ||
var CMD_DEVICE_ID     = 0x8B // no payload                               || [device id]                             ||
var CMD_MANUF_ID      = 0x8C // no payload                               || [manufacture id]                        ||
var CMD_JEDEC_ID      = 0x8D // no payload                               || [manufacture id][memory type][capacity] ||
//  -------------------------//-------------------------------------------------------------------------------------||
var CMD_PROGRAM_B     = 0x8E // [level]                                  || no payload                              ||
var CMD_DONE          = 0x8F // no payload                               || [level]                                 ||
//  -------------------------//-------------------------------------------------------------------------------------||
var STATUS_REG_SRP    = 0x80 // The Status Register Protect              ||                                         ||
var STATUS_REG_REV    = 0x40 // Reserved Bits                            ||                                         ||
var STATUS_REG_BP3    = 0x20 // Block Protect Bits BP3                   ||                                         ||
var STATUS_REG_BP2    = 0x10 // Block Protect Bits BP2                   ||                                         ||
var STATUS_REG_BP1    = 0x08 // Block Protect Bits BP1                   ||                                         ||
var STATUS_REG_BP0    = 0x04 // Block Protect Bits BP0                   ||                                         ||
var STATUS_REG_WEL    = 0x02 // Write Enable Latch                       ||                                         ||
var STATUS_REG_WIP    = 0x01 // Write In Progress                        ||                                         ||
//  -------------------------//-------------------------------------------------------------------------------------||

module.exports = function Arduino(serialport)
{
  var self = new Emmiter();

  self.serial = new SerialPort(serialport, {
    baudrate: 115200,
    buffersize: 1
  });

  self.serial.on('data', function(data) {
    if (self.connected)
    {
      //console.log('SERIAL RECEIVED: ' + data);
      self.parser.write(data);
    }
  });

  self.serial.on('open', function() {
    self.connected = true;
    self.emit('ready');
  });

  self.serial.on('error', function(err) {
    log.err('SERIAL ERROR', err);
  });

  function onData(msg) {
    self.process(msg)
  };

  function onFraming(msg) {
    log.err('SLIP framing error!');
  };

  function onEscape(msg) {
    log.err('SLIP escape error!');
  };

  self.parser = new slip.parser({
    data    : onData,
    framing : onFraming,
    escape  : onEscape
  }, false);

  function setCallback(cmd, callback)
  {
    self.ackCmd = cmd;
    self.callback = callback;
    self.timeout = setTimeout(function() {
      log.err('Command execution timeout!');
      self.callback(true);
      self.ackCmd = undefined;
      self.callback = undefined;
    }, 100);
  }

  self.process = function(msg)
  {
    if (self.callback)
    {
      clearTimeout(self.timeout);
      if (msg[0] == self.ackCmd)
      {
        self.callback(false, msg.slice(1));
      }
      else if (msg[0] == CMD_DEBUG)
      {
        self.emit('debug', msg.slice(1).toString('hex'));
      }
      else
      {
        log.err('Wrong command:', msg[0]);
        self.callback(true, msg.slice(1));
      }
    }
  };

  self.echo = function(callback)
  {
    self.serial.write(slip.generator(new Buffer([CMD_ECHO])));
    setCallback(CMD_ECHO, callback);
  };

  self.spiMode = function(mode, order, prescaler, callback)
  {
    self.serial.write(slip.generator(new Buffer([CMD_SPI_MODE, mode, order, prescaler])));
    setCallback(CMD_SPI_MODE, callback);
  };

  self.spiRequest = function(data, callback)
  {
    var buf = new Buffer(data.length + 1)
    buf[0] = CMD_SPI_REQUEST;
    data.copy(buf, 1)
    self.serial.write(slip.generator(buf));
    setCallback(CMD_SPI_REQUEST, callback);
  };

  self.program = function(level, callback)
  {
    var buf = new Buffer(2);
    buf[0] = CMD_PROGRAM_B;
    buf[1] = level ? 1 : 0;
    self.serial.write(slip.generator(buf));
    setCallback(CMD_PROGRAM_B, callback);
  };

  self.done = function(callback)
  {
    var buf = new Buffer(1);
    buf[0] = CMD_DONE;
    self.serial.write(slip.generator(buf));
    setCallback(CMD_DONE, function(msg) {
      callback(msg[1]);
    });
  };

  self.deviceId = function(callback)
  {
    self.serial.write(slip.generator(new Buffer([CMD_DEVICE_ID])));
    setCallback(CMD_DEVICE_ID, function(err, msg) {
      if (err)
        callback(true);
      else
        callback(false, msg[0]);
    });
  };

  self.manufactureId = function(callback)
  {
    self.serial.write(slip.generator(new Buffer([CMD_MANUF_ID])));
    setCallback(CMD_MANUF_ID, function(err, msg) {
      if (err)
        callback(true);
      else
        callback(false, msg[0]);
    });
  };

  self.jdecId = function(callback)
  {
    self.serial.write(slip.generator(new Buffer([CMD_JEDEC_ID])));
    setCallback(CMD_JEDEC_ID, function(err, msg) {
      if (err)
        callback(true);
      else
        callback(false, msg[0], msg[1], msg[2]);
    });
  };

  self.chipErase = function(callback)
  {
    self.serial.write(slip.generator(new Buffer([CMD_CHIP_ERASE])));
    setCallback(CMD_CHIP_ERASE, callback);
  };

  self.writeStatus = function(status, callback)
  {
    self.serial.write(slip.generator(new Buffer([CMD_WRITE_STATUS, status])));
    setCallback(CMD_WRITE_STATUS, callback);
  };

  self.readStatus = function(callback)
  {
    self.serial.write(slip.generator(new Buffer([CMD_READ_STATUS])));
    setCallback(CMD_READ_STATUS, function(err, msg) {
      callback(err, {
        wip: msg[0] & STATUS_REG_WIP ? true : false,
        wel: msg[0] & STATUS_REG_WEL ? true : false,
        bp0: msg[0] & STATUS_REG_BP0 ? true : false,
        bp1: msg[0] & STATUS_REG_BP1 ? true : false,
        bp2: msg[0] & STATUS_REG_BP2 ? true : false,
        bp3: msg[0] & STATUS_REG_BP3 ? true : false,
        rev: msg[0] & STATUS_REG_REV ? true : false,
        srp: msg[0] & STATUS_REG_SRP ? true : false,
      });
    });
  };

  self.writeEnable = function(callback)
  {
    setCallback(CMD_WRITE_ENABLE, callback);
    self.serial.write(slip.generator(new Buffer([CMD_WRITE_ENABLE])));
  };

  self.writeDisable = function(callback)
  {
    self.serial.write(slip.generator(new Buffer([CMD_WRITE_DISABLE])));
    setCallback(CMD_WRITE_DISABLE, callback);
  };

  self.readData = function(addr, length, callback)
  {
    self.serial.write(
      slip.generator(new Buffer([
        CMD_READ_DATA,
        (addr >> 16) & 0xFF,
        (addr >> 8) & 0xFF,
        addr & 0xFF,
        length
    ])));
    setCallback(CMD_READ_DATA, callback);
  }

  self.writeData = function(addr, data, callback)
  {
    self.writeEnable(function(err) {
      //console.log('writeEnable:', err);
      if (err) return callback(true);

      var buf = new Buffer(data.length + 4);
      buf[0] = CMD_PAGE_PROGRAM;
      buf[1] = (addr >> 16) & 0xFF;
      buf[2] = (addr >> 8) & 0xFF;
      buf[3] = addr & 0xFF;
      data.copy(buf, 4);

      setCallback(CMD_PAGE_PROGRAM, function(err, msg) {
        //console.log('CMD_PAGE_PROGRAM:', err, msg);
        if (err) return callback(true);
        callback(false, (msg[0] << 16) | (msg[1] << 8) | msg[2], msg[3]);
      });

      //console.log('Write data:', buf);
      self.serial.write(slip.generator(buf));

    });
  }

  return self;
}
