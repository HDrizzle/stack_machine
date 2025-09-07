# Issues

## Board order 1

* The outputs in the dual 4-input OR gate are entered backward in the KiCad symbol, this affects the control unit central timing and the bus. (FIXED FOR VERSION 2)
* The silkscreen LED labels on the central timing board are incorrect. (FIXED FOR VERSION 2)
* The resistor and capacitor on the startup controller analog timer should be swapped
* Whenever there is nothing writing to the program address bus, it is pulled high by the 16 pullup resistors. This is by design for when the computer starts up. The problem is that during a move sequence (and probably most other sequences) the post-adder latch output is disabled meaning the address is all 1s, the problem is that the memory will react instantly, changing for example the bus read/write addresses and probably other things too. Solution: Replace the transparent address latches on the memory board with edge-triggered ones that are triggered by the `program read done` signal. (FIXED FOR VERSION 2)
* Any fault triggered by the central timing board (except the `halt` comand) will not continue the main execution cycle, it will just stop. (IGNORED)
* The bits comming from both of the counters on the clock board are swaped when put on the bus. (FIXED FOR VERSION 2)
* The enable signal on the stack controller board is not connected to the enable pin. (FIXED FOR VERSION 2)
* DO NOT USE 4000B series logic, also >= 4.7k ohm on ALL LEDs. A lot of logic signals are low (like 3 volts) because of LED current draw.
* The post-adder latches for the GPRAM address aren't needed, instead use 10K resistors. This also means the `post adder CLK` and `post adder OE` signals are irrelevent.

### Stack controller timing issues (FIXED FOR VERSION 2)

* The push sequence for incrementing the post-adder clock had an `A-B-A & A` chain, it was chaged to have an `A-B` chain to obey the push timing diagram.
* The stack `pointer (0) / offset (1)` signal from the offset-write sequence had an `A-B-A-B` chain, it was changed to an `A-B` chain to obey the offset-write timing diagram.
* The `input latch output enable` signal from the "push / offset write" sequence was on an `A-B-A-B` chain, it was changed to an `A-B` chain, similarly the `memory write signal` which was part of the same chain was also changed from `A-B-A-B-A & A` to `A-B-A & A`.

## Display write timing issue

It is caused by the the regular update from the input latches to SRAM lining up with the computer updating the data in the input latches. It leads to the same piece of data (1 byte, 8 pixels on the display) getting smeared across two adjacent memory locations and corrupting the image. The way the two 32k x 8 memories are used is: one of them stores even-indexed bytes and the other odd-indexed bytes, meaning that when reading them, the same 6-bit address can be used for both of them and their outputs chained together to produce a 16 px line to write to one of the LED drivers. If the computer writes to the input latches while the `Memory write` pulse is happening, the address and data are both updated at the same time. If the address was just changed within a chip this wouldn't be a problem because the chip's WE# is edge-triggered. BUT when the address/data is updated (to a consecutive address) it switches from selecting one memory chip to the other, therefore ending the WE# pulse for one chip and enabling the WE# for the next one. Because the memory chip select logic (using the LSB of the byte address) has more propagation time then the data, the new data gets to the "old" memory chip faster then it can be deselected, causing it to be corrupted. The "new" memory chip is written to just fine.

```
{
  signal: [
    {name: "CLK", wave: "p|.......|"},
    {},
    {name: "Memory read", wave: "l|..h.l..|"},
    {name: "Memory output latch CLK", wave: "l|...hl..|"},
    {name: "Bit address", wave: "2222..2222", data: ["13", "14", "15", "0", "1", "2", "3", "4"]},
    {name: "Driver address", wave: "2..2......", data: ["7", "0"], node: "...a"},
    {name: "Counter enable", wave: "h|.l..h..|"},
    {name: "Counter CLK", wave: "p|..l.p..|"},
    {name: "Driver CLK enable", wave: "h|.l.nh..|"},
    {name: "Driver CLK", wave: "n|.l.nn..|"},
    {name: "Driver LE", wave: "l|.hl....|", node: "...b"},
    {},
    {name: "Memory write set data", wave: "l|....h.l|"},
    {name: "Memory write", wave: "l|.....pl|"},
  ],
  edge:['a~>b causes']
}
```

With the computer clock /16 and the display clock /256, with the extra move/write in the update loop (in `display_speed_test`), the glitch spacing is 9 rows on (on the same column).

A possible software solution is to seperately write all the even-indexed bytes then all the odd-indexed ones seperately so the chip being selected (by the address LSB) is (almost) never changed.