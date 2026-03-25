# LED Debug Board

This board will have all the state LEDs on it along with a lot of silkscreen text/grahics showing what they mean. Most boards (especially sequential ones) will have a set of jumpers and an associated pin header specifically to connect those debug signals to this board.

## Internal debug signals

These are lists of jumpers and connections to the global state LED board that are internal to the circuit and not connected to any outputs. Internal debug signals all use the "Jumper V2 gnd" symbol, except when the signal going in might by set by a pullup resistor. They will be connected before the corresponding jumpers and put through buffers to reduce possibility of EMI and slow timing issues.

## Board debug connections

### Main sequencer: (no pullup resistors in use)

Internal debug

0. Begin instruction sequence
1. Early PC++, non-flow-ctrl
2. Interrupt enable
3. Interrupt in-progress
4. Instruction Done
5. Bit 4 save for int call
6. Load Instruction

### Call stack: (no pullup resistors in use)

Internal debug

0. Pointer ++(0) / -- (1)
1. Pre-adder latch CLK
2. Post-adder latch CLK
3. Read
4. Write

### Control unit main: (some pullups)

Internal debug

0. GOTO Decider
1. Opcode (3-bit) 0 (AVOID PULLDOWN)
2. Opcode (3-bit) 1 (AVOID PULLDOWN)
3. Opcode (3-bit) 2 (AVOID PULLDOWN)
4. Instruction bit 4 (AVOID PULLDOWN)
5. PC MSB (AVOID PULLDOWN)
6. Interrupt
7. Instruction load possible

### Interrupt handler

0. Interrupt to main sequencer
1. TODO