# Timing

There will be 3 clock signals: A, B, and combined (ORed). They can all be described by a 4-part cycle:

| A | B | Combined |
| - | - | - |
| 0 | 0 | 0 |
| 1 | 0 | 1 |
| 0 | 0 | 0 |
| 0 | 1 | 1 |

Various devices in the computer will interact with each other using strictly different clocks (A and B) so as to make it simple to prevent race conditions. Devices' internal logic can be run on the combined clock if necessary to make it faster.

## Startup

There will be a signal sent to everything on the bus called `enable`, when low it will disable most timing logic and all bus-write outputs. On started, `enable` should be kept low for many clock cycles (probably like 10) then set high on B CLK. Then the `start` signal from the bus to the control unit will be set on the rising edge of A CLK for 1 cycle.

## Bus timing

| Line(s) | Controlled by | Clock set | Read by | Clock read |
| - | - | - | - | - |
| Write | Bus arbiter | A | Writing device | B |
| Read | Bus arbiter | B | Reading device | A |
| Read ready | Writing device | B | Bus arbiter | A |
| D0 - D7 | Writing device | B | Reading device | A |

<img src="images/bus_timing.png"></img>