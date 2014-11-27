var slip = require('node-slip')
var log = require('node-logging')
var SerialPort = require('serialport').SerialPort;

//===========================================================================
if (process.argv.length < 3)
{
  console.log('USE: node server-side.js COM#')
  process.exit(1)
}
//===========================================================================
var serial = new SerialPort(process.argv[2], {
  baudrate: 115200,
  buffersize: 1
});

serial.on('data', function(data) {
  if (self.connected)
  {
    console.log('SERIAL RECEIVED: ' + data)
  }
})

serial.on('open', function() {
  console.log('SERIAL OPEN')
  on()
})


var on = function()
{
  serial.write(slip.generator(new Buffer([0xAA, 0x00])))
  setTimeout(off, 1000)
}

var off = function()
{
  serial.write(slip.generator(new Buffer([0xBB, 0x00])))
  setTimeout(on, 1000)
}
