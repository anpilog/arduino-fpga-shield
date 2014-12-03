var program        = require('commander');
var arduino_serial = require('./arduino-serial');
var log            = require('node-logging');
var fs             = require('fs');

log.setLevel('debug');
//===========================================================================
program
.option('-e, --erase'       , 'Erase flash'                   )
.option('-r, --read [file]' , 'Read whole flash into file'    )
.option('-w, --write [file]', 'Write file into flash'         )
.option('-p, --port [file]' , 'Arduino serial port (required)')
.option('-i, --info'        , 'Get SPI flash info'            )
.version('0.0.1')
.parse(process.argv);

if (!program.port)
  program.help();
if (!program.read && !program.write && !program.info)
  program.help();

if (program.erase)
  console.log('Erase flash chip.');

if (program.port)
  console.log('Use', program.port, 'to talk to Arduino.');

if (program.read)
  console.log('Read flash to', program.read);
else if (program.write)
  console.log('Write file to', program.write);
else if (program.info)
  console.log('Get flash info');
else
{
  program.help();
  console.log('Exit');
  process.exit(1);
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

var readWrite = function()
{
  if (program.read)
  {
    log.inf('Read flash to file.')

    var offset = 0;
    var length = 340592;
    var bitFile = new Buffer(length);

    var read = function()
    {
      arduino.readData(offset, 255, function(err, data) {
        console.log(err, offset);
        data.copy(bitFile, offset);
        offset += 255;

        if (offset >= length)
        {
          fs.writeFileSync(program.read, bitFile);
          log.inf('Read bit file is done.');
        }
        else
        {
          read();
        }
      });

    };
    read();
  }
  else if (program.write)
  {
    log.inf('Write file to flash.')
    var bitFile = fs.readFileSync(program.write);
    var preambule = new Buffer([0xFF, 0xFF, 0xFF, 0xFF, 0xAA, 0x99, 0x55, 0x66]);
    var preambuleOffset = findInBuffer(preambule, bitFile);

    if (preambuleOffset == undefined)
    {
      log.err(program.write + ' is not valid bit file.');
      process.exit(1);
    }

    bitFile = bitFile.slice(preambuleOffset);
    log.inf('Write to flash ' + bitFile.length + ' bytes.');

    var offset = 0;
    var length = bitFile.length;
    var write = function()
    {
      var writeLength = length > 64 ? 64 : length;
      var data = bitFile.slice(offset, offset + writeLength);
      arduino.writeData(offset, data, function(err, addr, res) {
        if (err)
        {
          log.err('Can\'t write bit file.');
          process.exit(1);
        }
        offset += writeLength;
        length -= writeLength;
        if (length == 0)
        {
            log.inf('Bit file uploaded.');
        }
        else
        {
          setImmediate(write);
        }
        console.log('Write', writeLength, 'to', offset);
      });
    }
    write();
  }
  else
  {
    log.inf('Done.')
    process.exit(0);
  }
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
            log.err('Timeout chip erase.');
            process.exit(1);
          }
          if (status.wip)
          {
            setTimeout(checkWriteComplete, 100);
          }
          else
          {
            log.inf('Erased')
            callback();
          }
        });
      }
      checkWriteComplete();
    });
  });
}

var start = function()
{
    if (program.erase)
    {
      eraseChip(readWrite);
    }
    else
    {
      readWrite();
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

arduino.on('ready', function() {
  log.inf('Ready to go.')
  linkToDevice();
});
