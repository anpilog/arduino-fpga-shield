PinMap:

| Function | Arduino | FPGA              |
|:--------:|:-------:|:-----------------:|
|  MUX_SEL |    2    | MISO_ARD          |
|   MISO   |    12   | MISO_ARD          |
|   MOSI   |    11   | MOSI_ARD          |
|   SCLK   |    13   | SCLK_ARD          |
|    SS    |    10   | CS_ARD_STD_N      |
|  PROGRAM |    3    | PROGRAM_B         |
|   INIT   |         | INIT_B            |
|   DONE   |    7    | DONE_ARD/ALT_DONE |

Example:

Erase flash:

```
arduino-fpga -p /dev/cu.usbmodem1411 -e
```

Write flash:

```
arduino-fpga -p /dev/cu.usbmodem1411 -w firmware.bit
```

Erase and write flash:

```
arduino-fpga -p /dev/cu.usbmodem1411 -e -w firmware.bit
```

Read flash:

```
arduino-fpga -p /dev/cu.usbmodem1411 -w firmware.bit
```
