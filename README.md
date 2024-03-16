# Overview

The stack-based processor is an 8-bit little-endian computer using Reverse Polish Notation (RPN). The whole computer has a LIFO (Last In First Out) single stack which stores individual bytes. Memory pointers will be 16 bits. I am considering another piece of memory that will be sort of like the heap and can be written to and read from however the program wants.
I got the idea for this from my 1989 HP 48SX calculator which also uses RPN.

# Program instructions

1 or more byte instructions interpreted by the control unit. These may use arguments from the stack. The first 4 bits of the first instruction byte will address the below list of instructions. The next 4 bits will be used for addressing the ALU functions.

Here's the current list of instructions:

0. `MOVE` - Bus usage - The next byte of program memory will be interpreted as follows: bits 0 - 3 address the device which will set the state of the bus and bits 4 - 7 will address the device to read from it.
1. `PUSH` - Push following byte to stack
2. `GOTO` - Saves the 2 execution pointer GOTO latches (each of them are 1 byte) to the execution pointer
3. `STACK-OFFSET` - Set stack offset TODO
4. `STACK-OFFSET-CLR` Clear stack offset
5. `HALT` - Stops the clock, usefull for debugging

# Bus

Up to 15 devices can read the bus and 16 write to it.
Devices that can read the bus:

1. `STACK` - Stack controller (Push)
2. `ALU-A` - ALU latch A
3. `ALU-B` - ALU latch B
4. `GOTO-A` - Control unit - Execution pointer GOTO latch A (first byte)
5. `GOTO-B` - Control unit - Execution pointer GOTO latch B (second byte)
6. `GOTO-DECIDE` - Control unit - GOTO decider (For GOTO-IF)
7. `SRAM` - General SRAM - Write
8. `SRAM-INC-ADDR` - General SRAM - Write (++ address)
9. `SRAM-ADDR-A` - General SRAM - Address latch A
10. `SRAM-ADDR-B` - General SRAM - Address latch B

Note: read address 0 will not be used so that bytes can be poped from the stack without them going anywhere.

Devices that can set the state of the bus:

0. `STACK-NO-POP` - Stack controller (Don't pop)
1. `STACK-POP` - Stack controller (pop)
2. `ALU` - ALU output
3. `PROG-CONST` - Control unit - Const program byte
4. `PROG-ADDR-A` - Control unit - Execution pointer first byte
5. `PROG-ADDR-B` - Control unit - Execution pointer second byte
6. `SRAM` - General SRAM - Read
7. `SRAM-INC-ADDR` - General SRAM - Read (++ address)
8. `SRAM-ADDR-A` - General SRAM - Address bits 0 - 7
9. `SRAM-ADDR-B` - General SRAM - Address bits 8 - 15

# The Stack

The stack will simply be a piece of memory seperate from the program memory managed by hardware. Whenever the stack controller is given write access to the bus it will write the byte that is currently at the top-of-stack pointer and then it will decrement the pointer.

## Stack offset

The stack offset will be a 16-bit number subtracted from the top-of-stack pointer **only during non-pop reads**. It will be set by the main controller from program memory.

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

# Flow Control

In the actual machine code there are no such things as functions, loops, if-statements, etc. Instead, these will be converted by the compiler into instructions which explicitly set the program execution pointer.

## GOTO and GOTO-IF

A goto will first need to use the bus usage instruction (Instruction 0) twice to set both of the execution pointer A and B goto latches, probably comming from the stack. (This is for returning from a function using the return address, but if calling a function, the compiler will have to push those bytes onto the stack first.) Then the GOTO instruction will be used which uses the A and B goto latches to set the execution pointer.

There is no actual GOTO-IF instruction. Instead, use the bus usage instruction to read a given value (probably from the ALU or stack) into the control unit GOTO decider. This will do the same as the GOTO instruction described above ONLY if the LSB of the bus is 1.

# I/O

TODO

# General usage static-RAM

This piece of memory will not have any hardware protection like the stack and can be writen to and read from at any location (If the address is incremented then the read/write will happen first, then the incrementation). It will have a 16-bit address by 8-bit word size (65,536 bytes) just like the stack.

It's address latch can be optionally incremented upon reads/writes and can be directly set by 2 8-bit latches from the bus.