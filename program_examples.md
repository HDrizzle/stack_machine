# Examples of programs

## If-statement

If-statement which pops a boolean from the stack and then runs some code

```
// Prepare GOTO latches
WRITE 0x01 GOTO-B// upper byte of end addr
WRITE 0x02 GOTO-A// lower byte of end addr

// Pop boolean to be used for this if-statement from stack into ALU latch A
MOVE STACK-POP ALU-A
MOVE (NOT) ALU GOTO-DECIDE// Inverts byte and might execute GOTO to skip the contents of the if-statement
GOTO-IF
/*
Contents of if-statement
*/
// Rest of program starting at, for example, location `0x0102`
```

## Fibonacci sequence

Computes the first 10 fibonacci numbers and puts them into the general static-ram starting at address `0x0000`

```
// Set sram pointer
WRITE 0x00 SRAM-ADDR-A
WRITE 0x00 SRAM-ADDR-B

// Starting numbers
WRITE 0x01 STACK
WRITE 0x01 STACK
MOVE STACK-NO-POP SRAM-INC-ADDR
MOVE STACK-NO-POP SRAM-INC-ADDR
MOVE STACK-POP ALU-A
MOVE STACK-POP ALU-B

// While loop decision
// Prepare GOTO latches with end address
WRITE 0x00 GOTO-B// TODO: upper byte of end addr
WRITE 0x00 GOTO-A// TODO: lower byte of end addr
// Compare SRAM pointer and limit 
MOVE SRAM-ADDR-A ALU-A
WRITE 0x0A ALU-B
MOVE (GREATER-THEN) ALU GOTO-DECIDE
GOTO-IF

// Math
MOVE STACK-POP ALU-A
MOVE STACK-POP ALU-B
MOVE (A) ALU STACK
MOVE (ADD) ALU SRAM-INC-ADDR
MOVE (ADD) ALU STACK

// Goto beginning of loop
WRITE 0x00 GOTO-A// TODO: upper byte of start addr
WRITE 0x00 GOTO-B// TODO: lower byte of start addr
GOTO

// End
HALT
```