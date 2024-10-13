# Issues

## Board order 1

* The outputs in the dual 4-input OR gate are entered backward in the KiCad symbol, this affects the control unit central timing and the bus.
* The silkscreen LED labels on the central timing board are incorrect
* The resistor and capacitor on the startup controller analog timer should be swapped
* Whenever there is nothing writing to the program address bus, it is pulled high by the 16 pullup resistors. This is by design for when the computer starts up. The problem is that during a move sequence (and probably most other sequences) the post-adder latch output is disabled meaning the address is all 1s, the problem is that the memory will react instantly, changing for example the bus read/write addresses and probably other things too. Solution: Replace the transparent address latches on the memory board with edge-triggered ones that are triggered by the `program read done` signal.
* Any fault triggered by the central timing board (except the `halt` comand) will not continue the main execution cycle, it will just stop.
* The bits comming from both of the counters on the clock board are swaped when put on the bus.