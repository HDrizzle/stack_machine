# Physical construction for V2

There will be 1 "base board" horizontal along the very buttom which will be the bus board which everything connects to vertically. The startup controller will also be horizontal and connected to the bus board.

## Vertical layers

Starting from the control unit module and ending at the I/O controller

| Board | Connected to bus | Additional buttom connections | Additional connections | Notes |
| - | - | - | - | - |
| Main sequencer | No | No | Control unit main | Sits alongside call stack |
| Call stack | No | No | Control unit main | Sits alongside main sequencer |
| Control unit main | Yes | Controls mostly bus TX/RX addresses | ALU Opcode, Main sequencer, call stack, prog mem interface | Connected to 3 other boards besides bus |
| Prog memory module | Yes | No | Control unit main, GPRAM access controller module, Programming interface | None |
| GPRAM Shared memory | Yes | No | Prog mem module, GPRAM Sequencer & address | None |
| GPRAM sequencer & address | Yes | No | GPRAM Shared memory | None |
| ALU | Yes | No | Control unit main board for opcode | None |
| Stack sequencer | No | No | Stack (data) | Only attatched to stack main |
| Stack data/main | Yes | No | Stack sequencer | None |
| Interrupt sequencer | No | No | Interrupt handler data/main | None |
| Interrupt handler data/main | Yes | No | Interrupt active to control unit main sequencer, Front panel interrupts, Timer interrupts | None |
| Timers | Yes | No | Interrupt handler data/main for timer interrupts | Has internal 1 MHz clock |
| Vector digital board | Yes | No | Vector analog board (not yet designed) | None |
| I/O controller | Yes | No | No | Actually horizontal and will stick out to the side for easy pin access |

## Other boards

* Start pulse generator - Small circuit to generate start pulses that are updated on the + and - clock edges whenever the global `Enable` signal goes high.
* Base board - Bus timing and connections to almost everything else
* CLK / Control panel - Clock source & divider select, manual clock stepping, power switch, programming connection, interrupt connections, etc
* Global state LED panel - LEDs that show timing states from all other boards. There will be a lot of silkscreen graphics and labels. This board will have a lot of connections using 0.1" connectors.

## Board internal debug connections

These are lists of jumpers and connections to the global state LED board that are internal to the circuit and not connected to any outputs

These all use the "Jumper V2 debug" symbol

Main sequencer:

0. `Begin instruction sequence`
1. `Early PC++, non-flow-ctrl`
2. `Interrupt enable`
3. `Interrupt in-progress`
4. `Instruction Done`
5. `Bit 4 save for int call`
6. `Load Instruction`