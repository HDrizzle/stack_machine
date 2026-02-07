# Hardware Interrupt Handler

This will be a generic board connected to the bus. Interrupts will be triggered by rising edges, falling edges, timers, and comparators. They can be queued up to as many as 256. When an interrupt is triggered or when the handler returns and there is another one queued up, the normal program instruction will be overridden and the special `CALL` will be run with bit 4 set to 1.

Every interrupt has an 8-bit "code". The first 4 bits address the source of the interrupt, the last 4 bits vary depending on what the interrupt is. Interrupt sources are as follows:

0. Interrupt timer 0
1. Interrupt timer 1
2. Interrupt timer 2
3. Interrupt timer 3
4. Analog comparator 0
5. Analog comparator 1
6. Configurable
7. Configurable
8. Configurable
9. Configurable
10. Configurable
11. Configurable
12. Configurable
13. Configurable
14. Configurable
15. Configurable

The 10 configurable interrupts each correspond to a 5-pin header with the 1st pin being the active-high interrupt signal and the other 4 being the upper 4 bits of the interrupt code. For example 16 buttons could be encoded into the 4 customizable bits with the interrupt pin being triggered by any of them.

## Interface w/ control unit

There will be a single signal to the control unit timing, `Interrupt` which is read on the +clock edge. It will remain high as long as there is at least 1 interrupt in the queue.

## To bus (TX)

12. `INT-CODE` - Most recent interrupt code, will be cleared upon read
13. `INT-ACTIVE` - Whether there are any active interrupts