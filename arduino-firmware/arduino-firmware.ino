#include <SPI.h>

//-----------------------------------------------------------
#define SLIP_PACKET_LENGTH 512

#define SLIP_END	0xC0
#define SLIP_ESC	0xDB
#define ESC_END		0xDC
#define ESC_ESC 	0xDD

#define  SLIP_WAIT        0
#define  SLIP_PAYLOAD     1
#define  SLIP_ESC_PAYLOAD 2

class SLIP
{
public:
  typedef void (*command_collback_t)(byte*, int length);

  SLIP():
  callback(NULL)
  {

  }

  void setCallback(command_collback_t ptr)
  {
    callback = ptr;
  }

  void process(int ch)
  {

    switch(state)
    {
      //-----------------------------------------------------------
    case SLIP_WAIT:
      if (ch == SLIP_END)
      {
        index = 0;
        state = SLIP_PAYLOAD;
      }
      break;

      //-----------------------------------------------------------
    case SLIP_PAYLOAD:
      switch (ch)
      {
      case SLIP_END:
        if (index == 0)
        {
          // Wrong condition, 0xC0C0 on the bus. Drop only this byte
        }
        else
        {
          // End of packet, return message
          if (callback != NULL)
          {
            callback(buffer, index);
          }
          state = SLIP_WAIT;
        }
        break;
      case SLIP_ESC:
        // Escape character, drop one byte and process next
        state = SLIP_ESC_PAYLOAD;
        break;
      default:
        if (index < SLIP_PACKET_LENGTH)
        {
          buffer[index++] = ch;
        }
        else
        {
          state = SLIP_WAIT;
        }
        break;
      }
      break;
      //-----------------------------------------------------------
    case SLIP_ESC_PAYLOAD:
      switch (ch)
      {
      case ESC_END:
        buffer[index++] = SLIP_END;
        state = SLIP_PAYLOAD;
        break;
      case ESC_ESC:
        buffer[index++] = SLIP_ESC;
        state = SLIP_PAYLOAD;
        break;
      default:
        //-- Packet error!
        state = SLIP_WAIT;
        break;
      }
      break;
    }

  }
  void slipStart(byte cmd)
  {
    Serial.write(SLIP_END);
    slipSend(cmd);
  }
  void slipSend(byte ch)
  {
    if (ch == SLIP_END)
    {
      Serial.write(SLIP_ESC);
      Serial.write(ESC_END);
    }
    else if (ch == SLIP_ESC)
    {
      Serial.write(SLIP_ESC);
      Serial.write(ESC_ESC);
    }
    else
    {
      Serial.write(ch);
    }
  }
  void slipSend(byte *data, int len)
  {
    while(len--)
    {
      slipSend(*(data++));
    }
  }
  void slipEnd()
  {
    Serial.write(SLIP_END);
  }

private:
  int index;
  int state;
  byte buffer[SLIP_PACKET_LENGTH];
  command_collback_t callback;
};
//-----------------------------------------------------------
//-----------------------------------------------------------
//-----------------------------------------------------------
//-----------------------------------------------------------
#define MUX_SEL 2
#define MISO    12
#define MOSI    11
#define SCLK    13
#define SS      10
#define PROGRAM 3
#define DONE    7

SLIP slip;

//-Common----------------------------||-From PC----------------------------------||-To PC-----------------------------------||
#define CMD_DEBUG               0x00 // no payload                               || {string}                                ||
#define CMD_OK                  0x01 // no payload                               || no payload                              ||
#define CMD_ERROR               0x02 // no payload                               || no payload                              ||
#define CMD_ECHO                0x03 // no payload                               || no payload                              ||
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
#define CMD_PAGE_PROGRAM        0x86 // [A23-A16][A15-A8][A7-A0]{data}           || [A23-A16][A15-A8][A7-A0][result]        ||
#define CMD_BLOCK_ERASE         0x87 // [A23-A16][A15-A8][A7-A0]                 || no payload                              ||
#define CMD_SECTOR_ERASE        0x88 // [A23-A16][A15-A8][A7-A0]                 || no payload                              ||
#define CMD_CHIP_ERASE          0x89 // no payload                               || no payload                              ||
#define CMD_POWER_DOWN          0x8A // no payload                               || no payload                              ||
#define CMD_DEVICE_ID           0x8B // no payload                               || [device id]                             ||
#define CMD_MANUF_ID            0x8C // no payload                               || [manufacture id]                        ||
#define CMD_JEDEC_ID            0x8D // no payload                               || [manufacture id][memory type][capacity] ||
//-----------------------------------//-------------------------------------------------------------------------------------||
#define CMD_PROGRAM_B           0x8E // [level]                                  || no payload                              ||
#define CMD_DONE                0x8F // no payload                               || [level]                                 ||
//-----------------------------------//-------------------------------------------------------------------------------------||
#define SPI_FLASH_WRITE_ENABLE  0x06 // no data                                                                             ||
#define SPI_FLASH_WRITE_DISABLE 0x04 // no data                                                                             ||
#define SPI_FLASH_READ_STATUS   0x05 // [status byte]                                                                       ||
#define SPI_FLASH_WRITE_STATUS  0x01 // [status byte]                                                                       ||
#define SPI_FLASH_READ_DATA     0x03 // [A23-A16][A15-A8][A7-A0]{data}                                                      ||
#define SPI_FLASH_FAST_READ     0x0B // [A23-A16][A15-A8][A7-A0][dummy]{data}                                               ||
#define SPI_FLASH_PAGE_PROGRAM  0x02 // [A23-A16][A15-A8][A7-A0]{data}                                                      ||
#define SPI_FLASH_BLOCK_ERASE   0xD8 // [A23-A16][A15-A8][A7-A0]                                                            ||
#define SPI_FLASH_SECTOR_ERASE  0x20 // [A23-A16][A15-A8][A7-A0]                                                            ||
#define SPI_FLASH_CHIP_ERASE    0x60 // no data                                                                             ||
#define SPI_FLASH_POWER_DOWN    0xB9 // no data                                                                             ||
#define SPI_FLASH_DEVICE_ID     0xAB // [dummy][dummy][dummy][device id]                                                    ||
#define SPI_FLASH_MANUF_ID      0x90 // [dummy][dummy][0x00][manufacture id][device id]                                     ||
#define SPI_FLASH_JEDEC_ID      0x9F // [manufacture id][memory type][capacity]                                             ||
//-----------------------------------//-------------------------------------------------------------------------------------||
#define STATUS_SRP              0x80 //
#define STATUS_REV              0x40 //
#define STATUS_BP3              0x20 //
#define STATUS_BP2              0x10 //
#define STATUS_BP1              0x08 //
#define STATUS_BP0              0x04 //
#define STATUS_WEL              0x02 //
#define STATUS_WIP              0x01 //
//-----------------------------------//-------------------------------------------------------------------------------------||
//-----------------------------------------------------------
byte readStatus()
{
  digitalWrite(SS, LOW);
  SPI.transfer(SPI_FLASH_READ_STATUS);
  byte status = SPI.transfer(0x00);
  digitalWrite(SS, HIGH);
  return status;
}
//-----------------------------------------------------------
void cammandProcessor(byte* buffer, int length)
{
  byte cmd = buffer[0];
  switch(cmd)
  {
    //--------------------------------------------------------
    case CMD_ECHO:
      slip.slipStart(cmd);
      slip.slipEnd();
      break;
    //--------------------------------------------------------
    case CMD_SPI_MODE:
      SPI.setDataMode(buffer[1]);
      SPI.setBitOrder(buffer[2]);
      SPI.setClockDivider(buffer[3]);

      slip.slipStart(cmd);
      slip.slipEnd();
      break;
    //--------------------------------------------------------
    case CMD_SPI_REQUEST:
      digitalWrite(SS, LOW);
      for (int i = 1; i < length; i++)
      {
        buffer[i] = SPI.transfer(buffer[i]);
      }
      digitalWrite(SS, HIGH);
      slip.slipStart(cmd);
      slip.slipSend(buffer+1, length-1);
      slip.slipEnd();
      break;
    //--------------------------------------------------------
    case CMD_PROGRAM_B:
      digitalWrite(PROGRAM, buffer[1]);
      slip.slipStart(cmd);
      slip.slipEnd();
      break;
    //--------------------------------------------------------
    case CMD_DONE:
      slip.slipStart(cmd);
      digitalRead(DONE);
      slip.slipEnd();
      break;
    //--------------------------------------------------------
    case CMD_WRITE_ENABLE:
      digitalWrite(SS, LOW);
      SPI.transfer(SPI_FLASH_WRITE_ENABLE);
      digitalWrite(SS, HIGH);
      
      slip.slipStart(CMD_WRITE_ENABLE);
      slip.slipEnd();
      break;
    //--------------------------------------------------------
    case CMD_WRITE_DISABLE:
      digitalWrite(SS, LOW);
      SPI.transfer(SPI_FLASH_WRITE_DISABLE);
      digitalWrite(SS, HIGH);
      
      slip.slipStart(cmd);
      slip.slipEnd();
      break;
    //--------------------------------------------------------
    case CMD_READ_STATUS:
      slip.slipStart(cmd);
      digitalWrite(SS, LOW);
      SPI.transfer(SPI_FLASH_READ_STATUS);
      slip.slipSend(SPI.transfer(00));
      digitalWrite(SS, HIGH);
      slip.slipEnd();
      break;
    //--------------------------------------------------------
    case CMD_WRITE_STATUS:
      digitalWrite(SS, LOW);
      SPI.transfer(SPI_FLASH_READ_STATUS);
      SPI.transfer(buffer[1]);
      digitalWrite(SS, HIGH);

      slip.slipStart(cmd);
      slip.slipEnd();
      break;
    //--------------------------------------------------------
    case CMD_READ_DATA:
      slip.slipStart(cmd);
      digitalWrite(SS, LOW);
      SPI.transfer(SPI_FLASH_READ_DATA);
      SPI.transfer(buffer[1]);
      SPI.transfer(buffer[2]);
      SPI.transfer(buffer[3]);
      while(buffer[4]--)
      {
        slip.slipSend(SPI.transfer(0x00));
      }
      digitalWrite(SS, HIGH);      
      slip.slipEnd();
      break;
    //--------------------------------------------------------
    case CMD_FAST_READ:
      slip.slipStart(cmd);
      digitalWrite(SS, LOW);
      SPI.transfer(SPI_FLASH_READ_DATA);
      SPI.transfer(buffer[1]);
      SPI.transfer(buffer[2]);
      SPI.transfer(buffer[3]);
      SPI.transfer(0x00);
      while(buffer[4]--)
      {
        slip.slipSend(SPI.transfer(0x00));
      }
      digitalWrite(SS, HIGH);      
      slip.slipEnd();
      break;
    //--------------------------------------------------------
    case CMD_PAGE_PROGRAM:
    {
      digitalWrite(SS, LOW);
      SPI.transfer(SPI_FLASH_PAGE_PROGRAM);
      SPI.transfer(buffer[1]);
      SPI.transfer(buffer[2]);
      SPI.transfer(buffer[3]);
      for(int i = 4; i < length; i++)
      {
        SPI.transfer(buffer[i]);
      }
      digitalWrite(SS, HIGH);
      while(readStatus() & STATUS_WIP);
      
      slip.slipStart(cmd);
      slip.slipSend(buffer[1]);
      slip.slipSend(buffer[2]);
      slip.slipSend(buffer[3]);
      slip.slipSend(length-4);
      slip.slipEnd();
      }
      break;
    //--------------------------------------------------------
    case CMD_BLOCK_ERASE:
      digitalWrite(SS, LOW);
      SPI.transfer(SPI_FLASH_BLOCK_ERASE);
      SPI.transfer(buffer[1]);
      SPI.transfer(buffer[2]);
      SPI.transfer(buffer[3]);
      digitalWrite(SS, HIGH);      
      slip.slipStart(cmd);
      slip.slipEnd();
      break;
    //--------------------------------------------------------
    case CMD_SECTOR_ERASE:
      digitalWrite(SS, LOW);
      SPI.transfer(SPI_FLASH_SECTOR_ERASE);
      SPI.transfer(buffer[1]);
      SPI.transfer(buffer[2]);
      SPI.transfer(buffer[3]);
      digitalWrite(SS, HIGH);      
      slip.slipStart(cmd);
      slip.slipEnd();
      break;
    //--------------------------------------------------------
    case CMD_CHIP_ERASE:
      digitalWrite(SS, LOW);
      SPI.transfer(SPI_FLASH_CHIP_ERASE);
      digitalWrite(SS, HIGH);
      
      slip.slipStart(cmd);
      slip.slipEnd();
      break;
    //--------------------------------------------------------
    case CMD_POWER_DOWN:
      digitalWrite(SS, LOW);
      SPI.transfer(SPI_FLASH_POWER_DOWN);
      digitalWrite(SS, HIGH);
      
      slip.slipStart(cmd);
      slip.slipEnd();
      break;
    //--------------------------------------------------------
    case CMD_DEVICE_ID:
      slip.slipStart(cmd);
      digitalWrite(SS, LOW);
      SPI.transfer(SPI_FLASH_DEVICE_ID);
      SPI.transfer(0x00);
      SPI.transfer(0x00);
      SPI.transfer(0x00);
      slip.slipSend(SPI.transfer(0x00));
      digitalWrite(SS, HIGH);      
      slip.slipEnd();
      break;
    //--------------------------------------------------------
    case CMD_MANUF_ID:
      slip.slipStart(cmd);
      digitalWrite(SS, LOW);
      SPI.transfer(SPI_FLASH_MANUF_ID);
      SPI.transfer(0x00);
      SPI.transfer(0x00);
      SPI.transfer(0x00);
      slip.slipSend(SPI.transfer(0x00));
      SPI.transfer(0x00);
      digitalWrite(SS, HIGH);      
      slip.slipEnd();
      break;
    //--------------------------------------------------------
    case CMD_JEDEC_ID:
      slip.slipStart(cmd);
      digitalWrite(SS, LOW);
      SPI.transfer(SPI_FLASH_JEDEC_ID);
      slip.slipSend(SPI.transfer(0x00));
      slip.slipSend(SPI.transfer(0x00));
      slip.slipSend(SPI.transfer(0x00));
      slip.slipSend(SPI.transfer(0x00));
      slip.slipSend(SPI.transfer(0x00));
      slip.slipSend(SPI.transfer(0x00));
      digitalWrite(SS, HIGH);      
      slip.slipEnd();
      break;
    //--------------------------------------------------------
  }
}
//-----------------------------------------------------------
//===========================================================
void setup()
{
  pinMode(SS,      OUTPUT);
  pinMode(MUX_SEL, OUTPUT);
  pinMode(PROGRAM, OUTPUT);
  pinMode(DONE,    INPUT_PULLUP);

  digitalWrite(SS,      HIGH);
  digitalWrite(PROGRAM, HIGH);
  digitalWrite(MUX_SEL, HIGH);

  SPI.begin();
  SPI.setClockDivider(SPI_CLOCK_DIV2);
  SPI.setDataMode(SPI_MODE0);
  SPI.setBitOrder(MSBFIRST);

  Serial.begin(115200);
  slip.setCallback(cammandProcessor);
}
//===========================================================
void loop()
{
  while(Serial.available())
  {
    slip.process(Serial.read());
  }

//  digitalWrite(SS,      HIGH);
//  delay(1000);
//  digitalWrite(SS,      LOW);
//  delay(1000);
}
//===========================================================

