var program        = require('commander');
var arduino_serial = require('./arduino-serial');
//===========================================================================
program
.option('-e, --erase'       , 'Erase flash'                   )
.option('-r, --read [file]' , 'Read whole flash into file'    )
.option('-w, --write [file]', 'Write file into flash'         )
.option('-p, --port [file]' , 'Arduino serial port (required)')
.version('0.0.1')
.parse(process.argv);

if (!program.port)
  program.help();
if (!program.read && !program.write)
  program.help();

if (program.erase)
  console.log('Erase flash chip.');

if (program.port)
  console.log('Use', program.port, 'to talk to Arduino.');

if (program.read)
  console.log('Read flash to', program.read);
else if (program.write)
  console.log('Write file to', program.write);
else
  program.help();
//===========================================================================
var arduino = new arduino_serial(program.port);

arduino.on();
