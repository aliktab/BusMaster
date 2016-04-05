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

| PIN | BUS       |        |
| --- | ---       | ---    |
|     |           | **I2C (Green)** |
| B10 | SCL       | Yellow |
| B3  | SDA       | Blue   |
| GND | GND       | Black  |
|     |           | **SPI (Blue)** |
| B13 | SCLK      | Yellow |
| B15 | MOSI      | Blue   |
| B14 | MISO      | Green  |
| GND | GND       | Black  |
| B5  | CS        | White  |
| B4  | IRQ       | Gray   |
|     |           | **UART (Yellow)** |
| A8  | CK        | Yellow |
| B6  | TX        | Blue   |
| B7  | RX        | Green  |
| GND | GND       | Black  |
|     |           | **GPIO (Red)** |
| B1  | ADC / PWM | White  |
| A7  | ADC / PWM | Blue   |
| A6  | ADC / PWM | Green  |
| A5  | ADC / PWM | Yellow |
| GND | GND       | Black  |
|     |           | **POWER (Black)** |
| VDD | VDD       | Red - 3.3v |
| VCC | VCC       | White - 5v controllable |
| GND | GND       | Black  |

