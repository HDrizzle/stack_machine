# Examples of programs

## Fibonacci sequence

Computes the first 10 fibonacci numbers and puts them into the general static-ram starting at address `0x0000`. This example is also used in one of the assembly and emulator tests.

```
// Set sram pointer
WRITE 0x00 GPRAM-ADDR-A
WRITE 0x00 GPRAM-ADDR-B

// Set stack offset to 0
WRITE 0x00 SET-STACK-OFFSET

// Starting numbers
WRITE 0x01 STACK-PUSH
WRITE 0x01 STACK-PUSH
MOVE OFFSET-READ GPRAM-INC-ADDR
MOVE OFFSET-READ GPRAM-INC-ADDR

// While loop decision
// Prepare GOTO latches with end address
WRITE 0x00 GOTO-B// Upper byte of end addr
WRITE 0x15 GOTO-A// Lower byte of end addr
// Compare GPRAM pointer and limit 
MOVE GPRAM-ADDR-A ALU-A
WRITE 0x0A ALU-B
MOVE (GREATER-THEN) ALU GOTO-DECIDER
GOTO-IF

// Math
MOVE STACK-POP ALU-A
MOVE STACK-POP ALU-B
MOVE A ALU STACK-PUSH
MOVE ADD ALU GPRAM-INC-ADDR
MOVE ADD ALU STACK-PUSH

// Goto beginning of loop
WRITE 0x07 GOTO-A// Upper byte of start addr
WRITE 0x00 GOTO-B// Lower byte of start addr
GOTO

// End
HALT
```