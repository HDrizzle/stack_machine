# Timer board

The timing board will have its own crytal and a large clock divider, it can also triger interrupts.

The base clock will be a 1 MHz crystal. That clock will be fed into 3 cascaded 12-bit counters which roll over every 68719.476736 seconds.

## Interrupt timers (x4)

Interrupt timers will be 8-bit counters with a configurable max value and time base. When they reach their max value they may be configured to cause an interrupt. They will rollover back to 0 and keep going unless paused by the program.

## From bus (RX)

22. `INT-AND-MAIN-TIMER-ADDRESS` - Bits 0 - 1 address 1 of the 4 interrupt timers. Bit 2 will reset the addressed counter to 0.
23. `INT-TIMER-CONFIG-MAX` - Sets the start value
24. `INT-TIMER-CONFIG-TIMEBASE-AND-ENABLE` - Bits 0 - 3 address every even-indexed bit of the main 36-bit divider up to bit 32, so 0x0 -> 1 MHz, 0x1 -> 250 KHz and so on. Bit 4 sets whether the timer is allowed to cause interrupts. Bit 5 sets whether the counter is currently counting.

## To bus (TX)

9. `MAIN-TIMER` - 8-bit section of the 36 bit main timer. Addressed by the `INT-AND-MAIN-TIMER-ADDRESS` (see above). Bits indexed are as follows based on that address: 0 -> 3-11, 1 -> 12-19, 2 -> 20-27, 3 -> 28-35.
10. `INT-TIMER` - reads the current value of any of the 4 interrupt timers, addressing works the same as `MAIN-TIMER` and is controlled by `INT-AND-MAIN-TIMER-ADDRESS`.