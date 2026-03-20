# Program memory board

The program emory consists of 2 128k x 8 flash chips in parallel for 16 bit word size. Since the control unit can only address 2^15 flash memory words and there are 2^17 available, there will be 2 jumpers that configure the 2 highest MSBs of both the chips.

## Writing

Just like on Version 1 there will be a 10-pin header to connect an Arduino (or any microcontroller) for programming. There will also be a bus connection (`FLASH`) to set the state of the 8 data input pins. There will be a jumper to select between the external (Arduino) and the Bus programming interfaces.