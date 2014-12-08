#!/usr/bin/env node

var program        = require('commander');
var arduino_serial = require('./arduino-serial');
var log            = require('node-logging');
var fs             = require('fs');

log.setLevel('debug');
//===========================================================================
program
.option('-e, --erase'        , 'Erase flash'                   )
.option('-r, --read [file]'  , 'Read whole flash into file'    )
.option('-w, --write [file]' , 'Write file into flash'         )
.option('-p, --port [file]'  , 'Arduino serial port (required)')
.option('-i, --info'         , 'Get SPI flash info'            )
.option('-s, --size [number]', 'Bytes to read'                 )
.version('0.0.1')
.parse(process.argv);

if (!program.port)
  program.help();
if (!program.read && !program.write && !program.info && !program.erase)
  program.help();

if (program.read && !program.size)
  program.help()

if (program.erase)
  log.inf('Erase flash chip.');

if (program.port)
  log.inf('Use ' + program.port + ' to talk to Arduino.');

if (program.read)
  log.inf('Read flash to ' + program.read + ', ' + program.size + 'bytes.');
else if (program.write)
  log.inf('Write file to ' + program.write);
else if (program.info)
  log.inf('Get flash info');
else if (program.erase)
  log.inf('Erase flash');
else
{
  program.help();
  exit(1, 'Exit');
}
//===========================================================================
var arduino = new arduino_serial(program.port);

var getJdecId = function()
{
  arduino.jdecId(function(err, manufId, memType, capacity) {
    log.inf('err:'          + err);
    log.inf('id:'           + manufId);
    log.inf('memory type:'  + memType);
    log.inf('capacity:'     + capacity);
    setTimeout(getJdecId, 1000);
  });
}

var getManufactureId = function()
{
  arduino.manufactureId(function(err, manufId) {
    log.inf('err:'          + err);
    log.inf('id:'           + manufId);
    if (manufId == 0x01)
    {

    }
    setTimeout(getManufactureId, 1000);
  });
}

var findInBuffer = function(what, where)
{
  for (var i = 0; i < where.length; i++)
  {
    var found = true;
    for (var j = 0; j < what.length; j++)
    {
      if (where[i+j] != what[j])
      {
        found = false;
        break;
      }
    }
    if (found)
      return i;
  }
  return undefined;
}

var readMode = function(callback)
{
  log.inf('Read flash to file.')

  var offset = 0;
  var length = Number(program.size); //340592;
  var bitFile = new Buffer(length);
  var prevPercent = '';

  var read = function()
  {
    arduino.readData(offset, 255, function(err, data) {
      if (err)
        return callback(err);

      data.copy(bitFile, offset);
      offset += 255;

      if (offset >= length)
      {
        fs.writeFileSync(program.read, bitFile);
        log.inf('Read bit file is done.');
        callback(false);
      }
      else
      {
        read();
      }

      var percent = Math.round(100 * (offset / length));
      if (percent != prevPercent)
        {
          log.inf(percent + '% read.');
          prevPercent = percent;
        }
    });

  };
  read();
}

var writeMode = function(callback)
{
  log.inf('Write file to flash.')
  var bitFile = fs.readFileSync(program.write);
  var preambule = new Buffer([0xFF, 0xFF, 0xFF, 0xFF, 0xAA, 0x99, 0x55, 0x66]);
  var preambuleOffset = findInBuffer(preambule, bitFile);

  if (preambuleOffset == undefined)
  {
    exit(1, program.write + ' is not valid bit file.');
  }

  bitFile = bitFile.slice(preambuleOffset);
  log.inf('Write to flash ' + bitFile.length + ' bytes.');

  var offset = 0;
  var length = bitFile.length;
  var prevPercent = '';
  var write = function()
  {
    var writeLength = length > 64 ? 64 : length;
    var data = bitFile.slice(offset, offset + writeLength);
    arduino.writeData(offset, data, function(err, addr, res) {
      if (err)
      {
        callback('Can\'t write bit file.');
      }
      offset += writeLength;
      length -= writeLength;
      if (length == 0)
      {
          log.inf('Bit file uploaded.');
          callback(false);
      }
      else
      {
        setImmediate(write);
      }

      var percent = Math.round(100 * (offset / bitFile.length));
      if (percent != prevPercent)
      {
        log.inf(percent + '% written.');
        prevPercent = percent;
      }
    });
  }
  write();
}

var eraseChip = function(callback)
{
  log.inf('Erase chip...');
  var startTime = new Date();

  arduino.writeEnable(function(err) {
    arduino.chipErase(function(err){
      if (err) return log.err('Can\'t write enable!');
      var checkWriteComplete = function()
      {
        arduino.readStatus(function(err, status){
          if (err) return log.err('Can\'t read status!');

          var now = new Date();
          if (now - startTime > 20000)
          {
            callback('Timeout chip erase.');
          }
          if (status.wip)
          {
            setTimeout(checkWriteComplete, 100);
          }
          else
          {
            log.inf('Erased')
            callback(false);
          }
        });
      }
      checkWriteComplete();
    });
  });
}

var start = function()
{
    if (program.erase && program.read)
    {
      eraseChip(function(err) {
        if (err) return exit(1, err);
        readMode(function(err) {
          if (err) return exit(1, err);
          exit(0);
        });
      });
    }
    else if (program.erase && program.write)
    {
      eraseChip(function(err) {
        if (err) return exit(1, err);
        writeMode(function(err) {
          if (err) return exit(1, err);
          exit(0);
        });
      });
    }
    else if (program.write)
    {
      arduino.program(0, function(err) {
        if (err) return exit(1, err);

        writeMode(function(err) {
          if (err) return exit(1, err);
          arduino.program(1, exit);
          exit(0);
        });

      });
    }
    else if (program.read)
    {
      readMode(function(err) {
        if (err) return exit(1, err);
        exit(0);
      });
    }
    else if (program.erase)
    {
      eraseChip(function(err) {
        if (err)
          exit(1, err);
        else
          exit(0);
        });
    }
    else
    {
      exit(0, 'Done.')
    }
}

var linkToDevice = function()
{
  arduino.echo(function(err) {
    if (err)
    {
      setTimeout(linkToDevice, 10);
    }
    else
    {
      start();
    }
  });
}

var exit = function(err, msg)
{
  if (msg)
    if (err)
      log.err('EXIT: ' + msg);
    else
      log.inf('EXIT: ' + msg);

  process.exit(err)
}

arduino.on('ready', function() {
  log.inf('Ready to go.')
  linkToDevice();
});
