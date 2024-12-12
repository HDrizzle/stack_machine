# Issues

## Board order 1

* The outputs in the dual 4-input OR gate are entered backward in the KiCad symbol, this affects the control unit central timing and the bus.
* The silkscreen LED labels on the central timing board are incorrect
* The resistor and capacitor on the startup controller analog timer should be swapped
* Whenever there is nothing writing to the program address bus, it is pulled high by the 16 pullup resistors. This is by design for when the computer starts up. The problem is that during a move sequence (and probably most other sequences) the post-adder latch output is disabled meaning the address is all 1s, the problem is that the memory will react instantly, changing for example the bus read/write addresses and probably other things too. Solution: Replace the transparent address latches on the memory board with edge-triggered ones that are triggered by the `program read done` signal.
* Any fault triggered by the central timing board (except the `halt` comand) will not continue the main execution cycle, it will just stop.
* The bits comming from both of the counters on the clock board are swaped when put on the bus.
* The enable signal on the stack controller board is not connected to the enable pin
* DO NOT USE 4000B series logic, also >= 4.7k ohm on ALL LEDs. A lot of logic signals are low (like 3 volts) because of LED current draw.
* The post-adder latches for the GPRAM address aren't needed, instead use 10K resistors. Thia also meant the `post adder CLK` and `post adder OE` signals are irrelevent.

### Stack controller timing issues

* The push sequence for incrementing the post-adder clock had an `A-B-A & A` chain, it was chaged to have an `A-B` chain to obey the push timing diagram.
* The stack `pointer (0) / offset (1)` signal from the offset-write sequence had an `A-B-A-B` chain, it was changed to an `A-B` chain to obey the offset-write timing diagram.
* The `input latch output enable` signal from the "push / offset write" sequence was on an `A-B-A-B` chain, it was changed to an `A-B` chain, similarly the `memory write signal` which was part of the same chain was also changed from `A-B-A-B-A & A` to `A-B-A & A`.