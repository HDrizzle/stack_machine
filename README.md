# Overview

This will be an 8-bit stack-based computer processor based off of Reverse Polish Notation (RPN). The whole computer has a LIFO (Last In First Out) single stack which stores individual bytes. Memory pointers will be 16 bits. There will be another piece of memory that will be sort of like the heap and can be written to and read from without hardware protection.
I got the idea for this from my 1989 HP 48SX calculator which also uses RPN.

# Program instructions

Each instruction will be 16 bits and interpreted by the control unit. The first 4 bits (0 - 3) of the instruction will address the below list of operations. The rest of the instruction (bits 4 - 15) may be ignored or used for different things depending on the specific operation.

Here's the current list of the operation codes (opcodes):

0. `MOVE` - Bus usage - The rest of the instruction will be interpreted as follows: bits 8 - 11 address the device which will set the state of the bus and bits 12 - 15 will address the device to read from it. Bits 4 - 7 are sent to the ALU as it's opcode incase the data is comming from it.
1. `WRITE` - Similar to `MOVE` exept writes instruction bits 4 - 11 to the bus. Bits 12 - 15 address the device to read from it. To push a byte to the stack, use `WRITE 0x42 STACK`.
2. `GOTO` - Saves the 2 execution pointer GOTO latches (each of them are 1 byte) to the execution pointer
3. `GOTO-IF` - Reads the LSB of the value in the goto decider latch and does a GOTO only if it is 1, otherwise does nothing
4. `HALT` - Stops the clock, usefull for debugging

# Bus

Up to 15 devices can read the bus and 16 write to it.
Devices that can read the bus:

0. `NONE` - Nothing reads this so that bytes can be poped from the stack without them going anywhere.
1. `STACK` - Stack controller (Push)
2. `ALU-A` - ALU latch A
3. `ALU-B` - ALU latch B
4. `GOTO-A` - Control unit - Execution pointer GOTO latch A (first byte)
5. `GOTO-B` - Control unit - Execution pointer GOTO latch B (second byte)
6. `GOTO-DECIDER` - Control unit - GOTO decider latch (For GOTO-IF)
7. `SRAM` - General SRAM - Write
8. `SRAM-INC-ADDR` - General SRAM - Write (++ address)
9. `SRAM-ADDR-A` - General SRAM - Address latch A
10. `SRAM-ADDR-B` - General SRAM - Address latch B
11. `GPIO-WRITE` - Writes to GPIO output pins
12. `STACK-OFFSET` - Sets the stack offset

Devices that can set the state of (write to) the bus:

0. `STACK-NO-POP` - Stack controller (Don't pop)
1. `STACK-POP` - Stack controller (pop)
2. `ALU` - ALU output
3. Control unit instruction bits 4 - 11, used for the `WRITE` instruction
4. `PROG-ADDR-A` - Control unit - Execution pointer first byte. This along with the second one will be needed for putting function return addresses on the stack.
5. `PROG-ADDR-B` - Control unit - Execution pointer second byte
6. `SRAM` - General SRAM - Read
7. `SRAM-INC-ADDR` - General SRAM - Read (++ address)
8. `SRAM-ADDR-A` - General SRAM - Address bits 0 - 7
9. `SRAM-ADDR-B` - General SRAM - Address bits 8 - 15
10. `GPIO-READ` - Reads GPIO input pins

First iteration of how the bus timing will work
<img src="bus_timing_drawing.jpg"></img>

# The Stack

The stack will simply be a piece of memory seperate from the program memory managed by hardware. Whenever the stack controller is given write access to the bus it will write the byte that is currently at the top-of-stack pointer and then it may decrement the pointer.

## Stack offset

The stack offset will be an 8-bit number subtracted from the top-of-stack pointer **only during non-pop reads**. It will be written to from the bus.

# ALU

The ALU uses 2 8-bit latches for input and has 1 output. The specific operation it does is controlled by 4 bits (2^4 = 16 operations). All operations that result in a boolean output all `0`s except for the result which is the LSB.

0. `ADD` - Add
1. `SUB` - Subtract
2. `MULT` - Multiply
3. `NOT` - Bitwise NOT (latch A)
4. `OR` - Bitwise OR
5. `AND` - Bitwise AND
6. `XOR` - Botwise XOR
7. `SHIFT-L` - Bitshift Left (latch A)
8. `SHIFT-R` - Bitshift Right (latch A)
9. `ADD-OVERFLOW` - Whether adding will overflow
10. `EQ` - Whether bytes are equal
11. `BOOL-EQ` - Whether the LSBs ar equal
12. `GREATER-THEN` - Whether A > B
13. `A` - Contents of A latch
14. `B` - Contents of B latch
15. `ADD-WITH-CARRY` - Add with incomming carry bit set to 1

# Flow Control

In the actual machine code there are no such things as functions, loops, if-statements, etc. Instead, these will be converted by the compiler into instructions which explicitly set the program execution pointer.

## GOTO and GOTO-IF

A goto will first need to use the bus usage instruction (Instruction 0) twice to set both of the execution pointer A and B goto latches, probably comming from the stack. This is for returning from a function using the return address, but if calling a function, the compiler can just `WRITE` the hardcoded values directly to the A and B latches. Then the GOTO instruction will be used which uses the A and B goto latches to set the execution pointer.

GOTO-IF: First, move a value into the control unit GOTO decider latch, then use the GOTO-IF instruction. This will do the same as the GOTO instruction described above ONLY if the LSB of the latch is 1.

# I/O

There will be 8 input and 8 seperate output pins.

# General usage static-RAM

This piece of memory will not have any hardware protection like the stack and can be writen to and read from at any location. It will have a 16-bit address by 8-bit word size (65,536 bytes) just like the stack.

It's address latch can be optionally incremented upon reads/writes and can be directly set by 2 8-bit latches (`SRAM-ADDR-A` and `SRAM-ADDR-B`) from the bus. If the address is incremented, the read/write will happen first, then the incrementation.