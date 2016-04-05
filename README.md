Bus Master
========================================


About
-----

This is [Espruino](http://www.espruino.com) based SW/SW tool developed to simply monitor and control common know buses and protocols like I2s, SPI, UART, PWM and so on.


License
-------

Please see the [LICENSE](LICENSE) file.


Hardware
-------

Espruino Pico wiring decribed below. Wires colors are referenced form the software part so it's important to use the same colors.

I2C (Green)

     B10    SCL     Yellow
     B3     SDA     Blue
     GND    GND     Black

SPI (Blue)

     B13    SCL     Yellow (SCLK)
     B15    SDI     Blue (MOSI)
     B14    SDO     Green (MISO)
     GND    GND     Black

     B5     CS      White
     B4     IRQ     Gray

UART (Yellow)

     A8     CK      Yellow
     B6     TX      Blue
     B7     RX      Green
     GND    GND     Black

GPIO (Red)

     B1     PIN     White
     A7     PIN     Blue
     A6     PIN     Green
     A5     PIN     Yellow
     GND    GND     Black

POWER (Black)

     VDD    VDD     Red - 3.3v
     VCC    VCC     White - 5v controllable
     GND    GND     Black

