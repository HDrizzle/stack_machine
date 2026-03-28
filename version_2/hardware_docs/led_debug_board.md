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

Output debug:

All 16 sequencer outputs are buffered and sent to the debug board. They are also jumpered with pulldowns.

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

### Program memory

Internal debug

0. Read mode
1. Write mode
2. D 0-7
3. D 8-15
4. A 0-7
5. A 8-15
6. Write interface select (0=bus, 1=external)

### Bus / Bus sequencer

All ORed inputs from all bus connections (TX Ready, etc) (except for Fault) and all outputs from the sequencer will be jumpered on the main board and buffered and sent to the LED debug board.

0. TX Ready/OE/RX
1. RX not ready
2. RX extend to controller
3. Bus save CLK (WARNING: Disabling may cause contention)
4. Bus save OE
5. Move done
6. RX extend from controller
7. Global enable out (from start pulse generator)

Just LEDs without jumpers will be placed alongside each bus slot and indicating for each slot: Fault, RX Extend to controller, RX not ready, TX ready.

### Interrupt handler

0. Interrupt to main sequencer
1. TODO