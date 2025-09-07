# Overview

This is the design and specifications for an 8-bit stack-based computer processor designed to support programming in Reverse Polish Notation (RPN). The computer has a LIFO (Last In First Out) stack which stores individual bytes. The Top of Stack (ToS) will be a 16-bit pointer which can be incremented and decremented for Pushes and Pops. It will also be possible to read/write the stack below the ToS. There will be another piece of memory, the general purpose static-RAM (GPRAM), that will be sort of like the heap and can be written to and read from without hardware protection.
I got the idea for this from my 1989 HP 48SX calculator which also uses RPN.

# Program instructions

Each instruction will be 16 bits and interpreted by the control unit. The first 4 bits (0 - 3) of the instruction will address the below list of operations. The rest of the instruction (bits 4 - 15) may be ignored or used for different things depending on the specific operation. The program memory can hold 2^16 instructions.

Here's the current list of the operation codes (opcodes):

0. `MOVE` - Bus usage - The rest of the instruction will be interpreted as follows: bits 8 - 11 address the device which will set the state of the bus and bits 12 - 15 will address the device to read from it. Bits 4 - 7 are sent to the ALU as it's opcode incase the data is comming from it.
1. `WRITE` - Writes instruction bits 4 - 11 to the bus. Bits 12 - 15 address the device to read from it.
2. `GOTO` - Saves the 2 execution pointer GOTO latches (each of them are 1 byte) to the program counter
3. `GOTO-IF` - Reads the LSB of the value in the goto decider latch and does a GOTO only if it is 1, otherwise does nothing
4. `HALT` - Stops the clock, usefull for debugging
5. `CALL` - Effectively the same as `GOTO` but also pushes the return address (current value of program counter) onto the call stack. Note: The return address can be copied as-is and does not need to be incremented because it will be incremented normally after each `RETURN` instruction when it is used.
6. `RETURN` - The program counter will be set to the return address popped off the top of the call stack.

# Bus

Up to 15 devices can read the bus and 16 write to it.
Devices that can read the bus:

0. `NONE` - Nothing reads this so that bytes can be popped from the stack without them going anywhere.
1. `STACK-PUSH` - Stack controller (Push)
2. `ALU-A` - ALU latch A
3. `ALU-B` - ALU latch B
4. `GOTO-A` - Control unit - Program counter GOTO latch A (first byte)
5. `GOTO-B` - Control unit - Program counter GOTO latch B (second byte)
6. `GOTO-DECIDER` - Control unit - GOTO decider latch (For GOTO-IF)
7. `GPRAM` - GPRAM - Write
8. `GPRAM-INC-ADDR` - GPRAM - Write (++ address)
9. `GPRAM-ADDR-A` - GPRAM - Address bits 0 - 7
10. `GPRAM-ADDR-B` - GPRAM - Address bits 8 - 15
11. `GPIO-WRITE-A` - Writes to GPIO output pins 0 - 7
12. `OFFSET-WRITE` - Replaces value in stack at `ToS - offset`, should not affect the ToS (actually does, see stack issue descrition)
13. `SET-STACK-OFFSET` - Sets the stack offset byte
14. `ALU-C-IN` - ALU latch for carry and borrow
15. `GPIO-WRITE-B` - Writes to GPIO output pins 8 - 15

Devices that can set the state of (write to) the bus:

0. `STACK-POP` - Stack controller (pop)
1. `OFFSET-READ` - Reads value from stack at `ToS - offset`, does not affect the ToS
2. `ALU` - ALU output
3. Control unit instruction bits 4 - 11, used for the `WRITE` instruction
4. `GPRAM` - GPRAM - Read
5. `GPRAM-INC-ADDR` - GPRAM - Read (++ address)
6. `GPRAM-ADDR-A` - GPRAM - Address bits 0 - 7
7. `GPRAM-ADDR-B` - GPRAM - Address bits 8 - 15
8. `GPIO-READ-A` - Reads GPIO input pins 0 - 7
9. `CLK-COUNTER-A` - Lower byte of clock counter
10. `CLK-COUNTER-B` - Upper byte of clock counter
11. `GPIO-READ-B` - Reads GPIO input pins 8 - 15

# The Stack

The stack will simply be a piece of memory seperate from the program memory and managed by hardware.

There will be two ways to access the stack:

1. Push and Pop
2. Using the current ToS pointer - stack offset (`OFFSET-WRITE` and `OFFSET-READ`) (does not change ToS). The stack offset will be a 1-byte number set from the bus (`SET-STACK-OFFSET`) and will not affect pushes and pops.

# ALU

The ALU uses 2 8-bit latches for input and has 1 output. The specific operation it does is controlled by 4 bits (2^4 = 16 operations). All operations that result in a boolean output all `0`s except for the result which is the LSB.

0. `ADD` - Add
1. `ADD-C` - Addition carry
2. `NOT` - Bitwise NOT (latch A)
3. `OR` - Bitwise OR
4. `AND` - Bitwise AND
5. `XNOR` - Bitwise XNOR, whether each pair of bits are equal
6. `SHIFT` - Bitshifts A left by the first 3 bits of B, bits that go off the end DO wrap around.
7. `EQ` - Whether bytes are equal
8. `A` - Contents of A latch
9. `B` - Contents of B latch
10. `EXT-10` - Extension (not implemented)
11. `EXT-11` - Extension (not implemented)
12. `EXT-12` - Extension (not implemented)
13. `EXT-13` - Extension (not implemented)
14. `EXT-14` - Extension (not implemented)
15. `EXT-15` - Extension (not implemented)

# Flow Control

There are four instructions for flow control: `GOTO`, `GOTO-IF`, `CALL`, and `RETURN`.

## GOTO and GOTO-IF

A `GOTO` instruction is used to jump to anywhere in the program. it uses the two 8-bit latches (`GOTO-A` and `GOTO-B`) to set the 16-bit program counter. Due to how the hardware is set up, the PC will be incremented after each goto instruction. This means that the previous address to where the execution should jump to must be used.

`GOTO-IF` is a conditional goto which will do what is described above only if the bit set by `GOTO-DECIDER` from the LSB of the bus is 1, otherwise it does nothing. This is the only instruction that allows the computer to "branch" or "make decisions".

There are macros, `@goto(anchor_name)` and `@goto_if(anchor_name)` that make GOTOs a lot easier.

## Functions and the call stack

Functions in the machine code are defined by `CALL` and `RETURN` instructions. To call a function, make sure the correct pointer to the beginning of the function is stored in the control unit goto A and B latches. Then use the `CALL` instruction which is basically a GOTO but will first put the current program counter value onto the call stack as the return address. The return instruction pops a return address off of the call stack and continues execution.

There is a macro in the assembly language, `@call(function_name)` that makes calling a lot easier.

The call stack is a seperate stack memory containing 256 (1 byte address size) 16-bit words. Each word will be a return address - where to set the program counter during a `RETURN` instruction.

# I/O

There are 16 input and 16 seperate output pins accessible with the `GPIO-READ-A`, `-B` and `GPIO-WRITE-A`, `-B` bus sources/destinations.

## Writing to the display

The display has 32 x 32 LEDs, any given row of 8 pixels are written all at once with one byte. These rows of 8 are addressed by a 7-bit number starting at the top-left and going across for 4 per row (32 / 8 = 4) for each of the 32 rows of the display. The display currently is attached to the gpio-write a and b outputs with gpio-write-a being the address (MSB is ignored) and gpio-write-b being the data. The signal to write the address/data to the display's memory is sent by the hardware when gpio-write-b is written to, meaning the address should be written first and then the data.

# General purpose static-RAM (GPRAM)

This piece of memory does not have any hardware protection like the stack and can be writen to and read from at any location. It will have a 16-bit address by 8-bit word size (65,536 bytes) just like the stack.

Its address can be optionally incremented upon reads/writes and can be directly set from the bus (`GPRAM-ADDR-A` and `GPRAM-ADDR-B`). For the instructions where the address is incremented, that will happen after the read/write.

# Programming

The assembly language closely reflects the actual instructions that it will be converted into. Instructions consist of tokens which can be assembly words (defined in `assembler_config/config.json`) and literal values such as `0x42` or `0b0101` (currently only hex is supported). Instructions and macros are seperated by simicolons (`;`) and all whitespace is ignored except for spaces between instruction tokens. Anything after `#` on a line is treated as a comment.

Keep in mind how all the hardware registers work - if there is some value in one that is important, it will be erased when something is written over top of it. So keep track of where your "variables" are stored and how they are moved around.

## Macros

Macros are a way to simplify common parts of the program and to make calling functions easier. A macro consists of a name starting with `@` which is made out of identifier characters followed by parenthesis (`()`) with comma-seperated arguments inside them.

### Anchors

Anchors mark a place in a program that may be `call`ed to `goto`ed to, for example:

```
@anchor(function_name)
```

marks the beginning of a function. An anchor can also mean other things such as the beginning of a loop or the end of an if-statement. To go to an achor, use:

```
@call(function_name)
```

which will be expanded to three instructions: `write 0xXX goto-a`, `write 0xXX goto-b`, `call` where it will write the correct address to the GOTO A & B latches. `@goto(_)` and `goto_if(_)` work in the exact same way.

### Write string

Another macro is `@write_string("Hello world")` which will write each character of the given string (in ASCII) to the GPRAM starting at wherever the address is currently set to.

### Get anchor address

Sometimes it is necessary to access the address of an achor without using any flow control macros. This is why there is the `@push_anchor_address(anchor_name)` macro. It will push two bytes onto the stack, starting with address bits 0 - 7 then 8 - 15.

# Program examples

## Fibonacci sequence

```
write 0x00 gpio-write-a;# Initial throwaway instruction because there's a hardware problem
# Initialize both operands with 1
write 0x01 alu-a;
write 0x01 alu-b;
@anchor(loop-start);
# Add and output
move add alu gpio-write-b;
# Add and put it back into first operand
move add alu alu-a;
# Add and output
move add alu gpio-write-b;
# Add and put it back into second operand
move add alu alu-b;
@goto(loop-start);
```

## Writing a constant image to the display

This program writes image data first to gpram and then copies it to the display. Writing to the gpram is easy because of the post-increment-address feature.

```
write 0x00 gpio-write-a;
# Write to GPRAM starting at 0x0000 then uses `update-display` (copied from tetris) to write to display
@call(clear-display);
@call(write-image);
@call(update-display);
@anchor(infinite-loop);
@goto(infinite-loop);

@anchor(write-image);
write 0x00 gpram-addr-a;
write 0x00 gpram-addr-b;
# Image
write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;
write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;
write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;
write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;
write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;
write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;
write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;
write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;

write 0xFF gpram-inc-addr;write 0xFF gpram-inc-addr;write 0xFF gpram-inc-addr;write 0xFF gpram-inc-addr;
write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;
write 0x0F gpram-inc-addr;write 0xE1 gpram-inc-addr;write 0xFF gpram-inc-addr;write 0xF0 gpram-inc-addr;
write 0x06 gpram-inc-addr;write 0x41 gpram-inc-addr;write 0x8C gpram-inc-addr;write 0x61 gpram-inc-addr;
write 0x06 gpram-inc-addr;write 0x41 gpram-inc-addr;write 0x0C gpram-inc-addr;write 0x63 gpram-inc-addr;
write 0x8E gpram-inc-addr;write 0x63 gpram-inc-addr;write 0x0C gpram-inc-addr;write 0x63 gpram-inc-addr;
write 0x8C gpram-inc-addr;write 0x23 gpram-inc-addr;write 0x0C gpram-inc-addr;write 0x63 gpram-inc-addr;
write 0x8C gpram-inc-addr;write 0x23 gpram-inc-addr;write 0x8C gpram-inc-addr;write 0x61 gpram-inc-addr;

write 0xDC gpram-inc-addr;write 0x37 gpram-inc-addr;write 0xFC gpram-inc-addr;write 0x60 gpram-inc-addr;
write 0x58 gpram-inc-addr;write 0x16 gpram-inc-addr;write 0x0C gpram-inc-addr;write 0x60 gpram-inc-addr;
write 0x58 gpram-inc-addr;write 0x16 gpram-inc-addr;write 0x0C gpram-inc-addr;write 0x60 gpram-inc-addr;
write 0x78 gpram-inc-addr;write 0x1E gpram-inc-addr;write 0x0C gpram-inc-addr;write 0x60 gpram-inc-addr;
write 0x30 gpram-inc-addr;write 0x0C gpram-inc-addr;write 0x0C gpram-inc-addr;write 0x60 gpram-inc-addr;
write 0x30 gpram-inc-addr;write 0x0C gpram-inc-addr;write 0x1E gpram-inc-addr;write 0xF0 gpram-inc-addr;
write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;
write 0xFF gpram-inc-addr;write 0xFF gpram-inc-addr;write 0xFF gpram-inc-addr;write 0xFF gpram-inc-addr;

write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;
write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;
write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;
write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;
write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;
write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;
write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;
write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;write 0x00 gpram-inc-addr;
return;

@anchor(update-display);
# This function is more complicated than it should be because there is a hardware race condition that corrupts data written to the display and this mostly gets around it
# Even-indexed bytes
write 0x00 gpram-addr-a;
write 0x00 gpram-addr-b;
# Init counter
write 0x00 stack-push;
write 0x00 set-stack-offset;
# Loop
@anchor(update-display-even-odd-bytes-even-loop-start);
# Write to display
move offset-read gpio-write-a;
move gpram-inc-addr gpio-write-b;
move gpram-inc-addr none;# Increment GPRAM address twice to keep it synced w/ display index
# Increment counter
move offset-read alu-a;
write 0x02 alu-b;
move add alu offset-write;
# Check if it is 128
move offset-read alu-a;
write 0x80 alu-b;
move eq alu alu-a;
move not alu goto-decider;
@goto_if(update-display-even-odd-bytes-even-loop-start);
move stack-pop none;
# Odd-indexed bytes
write 0x01 gpram-addr-a;
write 0x00 gpram-addr-b;
# Init counter
write 0x01 stack-push;
write 0x00 set-stack-offset;
# Loop
@anchor(update-display-even-odd-bytes-odd-loop-start);
# Write to display
move offset-read gpio-write-a;
move gpram-inc-addr gpio-write-b;
move gpram-inc-addr none;# Increment GPRAM address twice to keep it synced w/ display index
# Increment counter
move offset-read alu-a;
write 0x02 alu-b;
move add alu offset-write;
# Check if it is 129
move offset-read alu-a;
write 0x81 alu-b;
move eq alu alu-a;
move not alu goto-decider;
@goto_if(update-display-even-odd-bytes-odd-loop-start);
# Done
move stack-pop none;
return;

# The display is controlled by SRAM. When it first recieves power it will initialize to random noise. Good practice is to clear it at the beginning of any program.
@anchor(clear-display);
write 0x00 alu-a;
@anchor(clear-display-loop-start);
move a alu gpio-write-a;
write 0x00 gpio-write-b;
write 0x01 alu-b;
move add alu alu-a;
write 0x80 alu-b;
move eq alu goto-decider;
@goto_if(clear-display-loop-end);
@goto(clear-display-loop-start);
@anchor(clear-display-loop-end); 
return;
```

# Important hardware issue

There is an unresolved problem with the stack, where anything written using `OFFSET-WRITE` will also write that same value at the top of the stack (ToS). There are usually ways of getting around this, such as saving the current ToS value somewhere else, writing to `OFFSET-WRITE`, then restoring the value at the top. The emulator being used has been programmed to replicate this problem so that programs can still be tested to be able to get around it. This behaviour should never be relied upon when writing code.