# Bus controller

TX and RX addresses are both 5 bits. Both the TX and RX devices have the option to delay TX or RX respectively.

Timing signals
| Signal | Set by | Set clock edge |
| - | - | - |
| Move / TX | Main sequencer | + |
| TX Ready / OE | TX Device | + (1.5 cycles) |
| RX Not Ready | RX Device | + |
| Bus save CLK & OE | Bus controller | - |
| Move done | Bus controller | - |