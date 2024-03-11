# Overview

The stack-based processor is an 8-bit little-endian computer using Reverse Polish Notation (RPN) to call functions. The whole computer has a LIFO (Last In First Out) single stack which can be used to store arguments and return values for functions. Memory pointers will be 16 bits. I am considering another piece of memory that will be sort of like the heap and can be written to and read from however the program wants.
I got the idea for this from my 1989 HP 48SX calculator which also uses RPN.

## Bytecode

Instructions
A 1-byte command that controls the computer’s hardware. These may use arguments from the stack.

0. Hardware function call
1. Push following object literal to stack
2. Pop from stack
3. GOTO - Pops 16-bit integer from stack and sets the execution pointer
4. GOTO-IF - Pops 1 byte from stack, if the LSB is 1 then does a GOTO, otherwise does nothing
5. Stops the clock

## Object Literals

The “Push” instruction will interpret the following bytes of the program as an object and it will be pushed to the stack. This will be used for things like constant values hardcoded into the program.

# Objects

The term “object” refers to a piece of information which can be stored and transported between different parts of the computer. Every object consists of a header which is 2 bytes representing the size (in bytes) of the whole object. For example an object representing an 8-bit integer would be `0x03 0x00 0xxx` where `0x03` represents the length of the whole thing and `0xxx` is the actual piece of data.

## Object header

An object consists of a header and a body, the header will always be 4 bytes.

# The Stack

The stack will simply be a list of objects managed by hardware. The hardware responsible for the stack memory will keep a table with pointers pointing to where each object starts in the memory. I may decide to have the stack be in the same memory as the program which would allow the program execution pointer to point to the stack and therefor make lambda functions possible, but I'm not certain of this yet.

# Flow Control

The program execution pointer (16 bits) is used to address the program memory, it is incremented to the next statement when a statement is finished and can be explicitly set by GOTO and GOTO-IF instructions.

In the actual machine code there are no such things as functions, loops, if-statements, etc. The only flow control consists of GOTO and GOTO-IF instructions that set the program execution pointer. Control flow such as functions, if-statements and loops will be converted by the compiler to use GOTO and GOTO-IF.
