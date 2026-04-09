# Arithemtic & Logic Unit (ALU)

The ALU will have 3 inputs from the bus:

2. `ALU-A` - ALU latch A
3. `ALU-B` - ALU latch B
14. `ALU-C-IN` - ALU latch for carry and borrow, only LSB is used.

And one output:

2. `ALU` - ALU output

The operation that is performed is controlled through a 4-bit address connected directly from bits 4-7 of the current instruction on the control unit main board.

## Expansion connector

Since only 10 of the 16 addressable instructions are implemented, there is an expansion connector on the ALU board which will allow modding with up to 6 custom functions.

For flexible timing support for the extension, the extension's `TX Ready` and `RX Extend half cycle (to controller)` signals are connected to the corresponding actual bus outputs.

The connections are (1-indexed because pin numbers):

1. A operand 0

...

8. A operand 7
9. B operand 0

...

16. B operand 7
17. C In (1 bit only)
18. Select# 10

...

23. Select# 15
24. Output 0

...

31. Output 7
32. TX Ready, set on rising edge just like actual bus signal
33. A updated, set for 1 cycle on rising edge after input latch clocked on falling edge
34. B updated, set for 1 cycle on rising edge after input latch clocked on falling edge
35. C updated, set for 1 cycle on rising edge after input latch clocked on falling edge
36. CLK
37. RX Extend half cycle, same timing as bus
38. +5V
39. GND

## Timing

There will be 2 main TX timing sequences based on whether the opcode is addressing a built-in function or external function.

### Built-in function TX

`TX Ready` will alway go high immediately since all built-ins are completely combinational. EX Extend (from controller) will be used as per usual to extend the OE to the bus another half cycle.

## External function TX

The function-select# lines will work different, this time not staying low for the `RX Extend` bus input. The `TX Ready` signal to the bus will only go high when the extension's `TX Ready` output goes high. The extension is responsible for extending its OE when the bus `RX Extend (from controller)` goes high.