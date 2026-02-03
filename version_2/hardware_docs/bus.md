# Bus controller

TX and RX addresses are both 5 bits. Both the TX and RX devices have the option to delay TX or RX respectively.

Bus TX ready signals will only last 1 cycle so that recieving logic doesn't have to deal with race conditions.

If the signal `RX extend half cycle` is high then values on the bus should remain valid for another half cycle after "TX Ready" goes low. This is to allow memory writes to happen without sketchy edge cases. This signal is in place to optimize the best possible bus move timing (1 clock cycle, not counting instruction load) but still allow memory writes to happen cleanly. The `RX extend half cycle (to TX device)` signal is delayed by a half cycle to make the timing logic in TX devices simpler.

There may be glitches in the initial move TX signal to bus devices so those signals should always be clocked in to logic on the -edge before anything is done.

Timing signals
| Signal | Set by | Set clock edge |
| - | - | - |
| Move / TX | Main sequencer | + |
| TX Ready | TX Device | + |
| RX Not Ready | RX Device | + |
| RX extend half cycle (to controller) | RX Device | + |
| RX extend half cycle (to TX device) | controller | - |
| Bus save CLK | Bus controller | - |
| Bus save OE | Bus controller | + |
| Move done | Bus controller | - |

## Timing

Plot sources to be pasted into <a href="wavedrom.com/editor.html">Wavedrom</a>.

The data source and destination will have their own sequences

### Without RX extend half cycle

Fastest possible case
```
{
  signal: [
    {name: "CLK", wave: "lhlh"},
	{},
	{name: "Main sequencer -> Move", wave: "lh.l"},
	{},
    {name: "Bus TX", wave: "lh.l"},
	{name: "TX ready", wave: "lh.l"},
	{name: "(actual data valid)", wave: "lh.l"},
	{name: "RX not ready", wave: "l..."},
	{name: "RX extend half cycle (to controller)", wave: "l..."},
	{name: "RX extend half cycle (to TX device)", wave: "l..."},
	{name: "Bus save CLK", wave: "l..."},
	{name: "Bus save OE", wave: "l..."},
	{name: "Move done", wave: "l.h."}
  ],
  edge: []
}
```

TX not ready, RX Ready
```
{
  signal: [
    {name: "CLK", wave: "lhlhlh"},
	{},
	{name: "Main sequencer -> Move", wave: "lh.l.."},
	{},
    {name: "Bus TX", wave: "lh.l..", node: ".a"},
	{name: "TX ready", wave: "l..h.l", node: "...b"},
	{name: "(actual data valid)", wave: "l..h.l"},
	{name: "RX not ready", wave: "l....."},
	{name: "RX extend half cycle (to controller)", wave: "l....."},
	{name: "RX extend half cycle (to TX device)", wave: "l....."},
	{name: "Bus save CLK", wave: "l....."},
	{name: "Bus save OE", wave: "l....."},
	{name: "Instruction done", wave: "l...h."}
  ],
  edge: ["a~>b TX Delay (possibly instant)"]
}
```

TX not ready, RX Not ready
```
{
  signal: [
    {name: "CLK", wave: "lhlhlhlh"},
	{},
	{name: "Main sequencer -> Move", wave: "lh.l...."},
    {},
	{name: "Bus TX", wave: "lh.l....", node: ".a"},
	{name: "TX ready", wave: "l..h.l..", node: "...b"},
	{name: "(actual data valid)", wave: "l..h.h.l"},
	{name: "RX not ready", wave: "l..h.l.."},
	{name: "RX extend half cycle (to controller)", wave: "l......."},
	{name: "RX extend half cycle (to TX device)", wave: "l......."},
	{name: "Bus save CLK", wave: "l...h.l."},
	{name: "Bus save OE", wave: "l....h.l"},
	{name: "Instruction done", wave: "l.....h."}
  ],
  edge: ["a~>b TX Delay (possibly instant)"]
}
```

### With RX extend half cycle

Fastest possible case
```
{
  signal: [
    {name: "CLK", wave: "lhlhl"},
	{},
	{name: "Main sequencer -> Move", wave: "lh.l."},
	{},
    {name: "Bus TX", wave: "lh.l."},
	{name: "TX ready", wave: "lh.l."},
	{name: "(actual data valid)", wave: "lh..l"},
	{name: "RX not ready", wave: "l...."},
	{name: "RX extend half cycle (to controller)", wave: "lh.l."},
	{name: "RX extend half cycle (to TX device)", wave: "l.h.l"},
	{name: "Bus save CLK", wave: "l...."},
	{name: "Bus save OE", wave: "l...."},
	{name: "Move done", wave: "l...h"}
  ],
  edge: []
}
```

TX not ready, RX Ready
```
{
  signal: [
    {name: "CLK", wave: "lhlhlhl"},
	{},
	{name: "Main sequencer -> Move", wave: "lh.l..."},
	{},
    {name: "Bus TX", wave: "lh.l...", node: ".a"},
	{name: "TX ready", wave: "l..h.l.", node: "...b"},
	{name: "(actual data valid)", wave: "l..h..l"},
	{name: "RX not ready", wave: "l......"},
	{name: "RX extend half cycle (to controller)", wave: "l..h.l."},
	{name: "RX extend half cycle (to TX device)", wave: "l...h.l"},
	{name: "Bus save CLK", wave: "l......"},
	{name: "Bus save OE", wave: "l......"},
	{name: "Instruction done", wave: "l.....h"}
  ],
  edge: ["a~>b TX Delay (possibly instant)"]
}
```

TX not ready, RX Not ready
```
{
  signal: [
    {name: "CLK", wave: "lhlhlhlhlh"},
	{},
	{name: "Main sequencer -> Move", wave: "lh.l......"},
    {},
	{name: "Bus TX", wave: "lh.l......", node: ".a"},
	{name: "TX ready", wave: "l..h.l....", node: "...b"},
	{name: "(actual data valid)", wave: "l..h.h...l"},
	{name: "RX not ready", wave: "l..h.l...."},
	{name: "RX extend half cycle (to controller)", wave: "l....h.l.."},
	{name: "RX extend half cycle (to TX device)", wave: "l.....h.l."},
	{name: "Bus save CLK", wave: "l...h...l."},
	{name: "Bus save OE", wave: "l....h...l"},
	{name: "Instruction done", wave: "l.......h."}
  ],
  edge: ["a~>b TX Delay (possibly instant)"]
}
```