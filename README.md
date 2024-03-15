# Overview

The stack-based processor is an 8-bit little-endian computer using Reverse Polish Notation (RPN). The whole computer has a LIFO (Last In First Out) single stack which stores individual bytes. Memory pointers will be 16 bits. I am considering another piece of memory that will be sort of like the heap and can be written to and read from however the program wants.
I got the idea for this from my 1989 HP 48SX calculator which also uses RPN.

# Instructions

1 or more byte instructions interpreted by the control unit. These may use arguments from the stack. The first 4 bits of the first instruction byte will address the below list of instructions. The next 4 bits will be used for addressing the ALU functions.

Here's the current list of instructions:

0. Bus usage command - The next byte of program memory will be interpreted as follows: bits 0 - 3 address the device which will set the state of the bus and bits 4 - 7 will address the device to read from it.
1. Push following byte to stack
2. GOTO - Uses the next 2 bytes of the program memory to set the execution pointer (I decided to not use arguments from the stack because all GOTO pointers will be determined by the compiler and won't need to be calculated at runtime.)
3. GOTO-IF - Pops 1 byte from stack, if the LSB is 1 then does a GOTO, otherwise does nothing
4. Set stack offset TODO
7. Stops the clock

# Bus

Up to 15 devices can read the bus and 16 write to it.
Devices that can read the bus:

1. Control unit
2. Stack controller
3. ALU latch A
4. ALU latch B

Note: read address 0 will not be used so that bytes can be poped from the stack without them going anywhere.

Devices that can set the state of the bus:

0. Control unit
1. Stack controller (Don't pop)
2. Stack controller (pop)
3. ALU output

# The Stack

The stack will simply be a piece of memory seperate from the program memory managed by hardware. Whenever the stack controller is given write access to the bus it will write the byte that is currently at the top-of-stack pointer and then it will decrement the pointer.

## Stack offset

The stack offset will be a 16-bit number subtracted from the top-of-stack pointer **only during non-pop reads**. It will be set by the main controller from program memory.

# Flow Control

In the actual machine code there are no such things as functions, loops, if-statements, etc. Instead, these will be converted by the compiler into GOTO and GOTO-IF instructions which explicitly set the program execution pointer.

# I/O

TODO