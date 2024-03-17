# Examples of programs

## If-statement

If-statement which pops a boolean from the stack and then runs some code

````
// Prepare GOTO latches
PUSH 0x01// upper byte of end addr
MOVE STACK-POP GOTO-B
PUSH 0x02// lower byte of end addr
MOVE STACK-POP GOTO-A

// Pop boolean to be used for this if-statement from stack into ALU latch A
MOVE STACK-POP ALU-A
(NOT) MOVE ALU GOTO-DECIDE// Inverts byte and might execute GOTO to skip the contents of the if-statement
/*
Contents of if-statement
*/
// Rest of program starting at, for example, location `0x0102`
````

## Fibonacci sequence

Computes the first 10 fibonacci numbers and puts them into the general static-ram starting at address `0x0000`

```
// Set sram pointer
PUSH 0x00
PUSH 0x00
MOVE STACK-POP SRAM-ADDR-A
MOVE STACK-POP SRAM-ADDR-B

// Starting numbers
PUSH 0x01
PUSH 0x01
MOVE STACK-NO-POP SRAM-INC-ADDR
MOVE STACK-NO-POP SRAM-INC-ADDR
MOVE STACK-POP ALU-A
MOVE STACK-POP ALU-B

// While loop decision
// Prepare GOTO latches with end address
PUSH 0x00// TODO: upper byte of end addr
MOVE STACK-POP GOTO-B
PUSH 0x00// TODO: lower byte of end addr
MOVE STACK-POP GOTO-A
// Compare SRAM pointer and limit 
MOVE SRAM-ADDR-A ALU-A
PUSH 0x0A
MOVE STACK-POP ALU-B
(GREATER-THEN) MOVE ALU GOTO-DECIDE

// Math
MOVE STACK-POP ALU-A
MOVE STACK-POP ALU-B
(A) MOVE ALU STACK
(ADD) MOVE ALU SRAM-INC-ADDR
(ADD) MOVE ALU STACK

// Goto beginning of loop
PUSH 0x00// TODO: upper byte of start addr
MOVE STACK-POP GOTO-B
PUSH 0x00// TODO: lower byte of start addr
MOVE STACK-POP GOTO-A
GOTO

// End
HALT
```