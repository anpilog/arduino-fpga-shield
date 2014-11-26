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

//-Common----------------------------||-From PC----------------------------------||-To PC-----------------------------------||
#define CMD_DEBUG               0x00 // no payload                               || {string}                                ||
#define CMD_OK                  0x01 // no payload                               || no payload                              ||
#define CMD_ERROR               0x02 // no payload                               || no payload                              ||
//-SPI-------------------------------//------------------------------------------||-----------------------------------------||
#define CMD_SPI_MODE            0x10 // [mode][bit order][speed prescaler]       || no payload                              ||
#define CMD_SPI_REQUEST         0x11 // {data}                                   || {data}                                  ||
//-IO--------------------------------//------------------------------------------||-----------------------------------------||
#define CMD_PIN_MODE            0x12 // [pin][mode]                              || no payload                              ||
#define CMD_PIN_WRITE           0x13 // [pin][value]                             || no payload                              ||
//-Flash-----------------------------//-------------------------------------------------------------------------------------||
#define CMD_WRITE_ENABLE        0x80 // no payload                               || no payload                              ||
#define CMD_WRITE_DISABLE       0x81 // no payload                               || no payload                              ||
#define CMD_READ_STATUS         0x82 // no payload                               || [status byte]                           ||
#define CMD_WRITE_STATUS        0x83 // [status byte]                            || no payload                              ||
#define CMD_READ_DATA           0x84 // [A23-A16][A15-A8][A7-A0][length]         || [A23-A16][A15-A8][A7-A0]{data}          ||
#define CMD_FAST_READ           0x85 // [A23-A16][A15-A8][A7-A0][length]         || [A23-A16][A15-A8][A7-A0]{data}          ||
#define CMD_PAGE_PROGRAM        0x86 // [A23-A16][A15-A8][A7-A0][validate]{data} || [A23-A16][A15-A8][A7-A0][result]        ||
#define CMD_BLOCK_ERASE         0x87 // [A23-A16][A15-A8][A7-A0]                 || no payload                              ||
#define CMD_SECTOR_ERASE        0x88 // [A23-A16][A15-A8][A7-A0]                 || no payload                              ||
#define CMD_CHIP_ERASE          0x89 // no payload                               || no payload                              ||
#define CMD_POWER_DOWN          0x8A // no payload                               || no payload                              ||
#define CMD_DEVICE_ID           0x8B // no payload                               || [device id]                             ||
#define CMD_MANUF_ID            0x8C // no payload                               || [manufacture id]                        ||
#define CMD_JEDEC_ID            0x8D // no payload                               || [manufacture id][memory type][capacity] ||
//-----------------------------------//-------------------------------------------------------------------------------------||
#define SPI_FLASH_WRITE_ENABLE  0x06 // no data
#define SPI_FLASH_WRITE_DISABLE 0x04 // no data
#define SPI_FLASH_READ_STATUS   0x05 // [status byte]
#define SPI_FLASH_WRITE_STATUS  0x01 // [status byte]
#define SPI_FLASH_READ_DATA     0x03 // [A23-A16][A15-A8][A7-A0]{data}
#define SPI_FLASH_FAST_READ     0x0B // [A23-A16][A15-A8][A7-A0][dummy]{data}
#define SPI_FLASH_PAGE_PROGRAM  0x02 // [A23-A16][A15-A8][A7-A0]{data}
#define SPI_FLASH_BLOCK_ERASE   0xD8 // [A23-A16][A15-A8][A7-A0]
#define SPI_FLASH_SECTOR_ERASE  0x20 // [A23-A16][A15-A8][A7-A0]
#define SPI_FLASH_CHIP_ERASE    0x60 // no data
#define SPI_FLASH_POWER_DOWN    0xB9 // no data
#define SPI_FLASH_DEVICE_ID     0xAB // [dummy][dummy][dummy][device id]
#define SPI_FLASH_MANUF_ID      0x90 // [dummy][dummy][0x00][manufacture id][device id]
#define SPI_FLASH_JEDEC_ID      0x9F // [manufacture id][memory type][capacity]
//-----------------------------------//-------------------------------------------------------------------------------------||
