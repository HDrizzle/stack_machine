# Hardware Interrupt Handler

This will be a generic board connected to the bus. Interrupts will be triggered by rising edges, falling edges, timers, and comparators. They can be queued up to as many as 256. When an interrupt is triggered or when the handler returns and there is another one queued up, the normal program instruction will be overridden and the special `CALL` will be run with bit 4 set to 1.

## Interface w/ control unit

There will be a single signal to the control unit timing, `Interrupt` which is read on the +clock edge.