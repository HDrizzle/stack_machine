# Bus controller

TX and RX addresses are both 5 bits. Both the TX and RX devices have the option to delay TX or RX respectively.

Bus TX ready signals will only last 1 cycle so that recieving logic doesn't have to deal with race conditions. NOTE: Values on the bus should remain valid for another half cycle after "TX Ready" goes low.

There may be glitches in the initial move TX signal to bus devices so those signals should always be clocked in to logic on the -edge before anything is done.

TODO: Delay bus save OE to after CLK

Timing signals
| Signal | Set by | Set clock edge |
| - | - | - |
| Move / TX | Main sequencer | + |
| TX Ready | TX Device | + |
| RX Not Ready | RX Device | + |
| Bus save CLK & OE | Bus controller | - |
| Move done | Bus controller | - |

### Timing

Plot sources to be pasted into <a href="wavedrom.com/editor.html">Wavedrom</a>.

The data source and destination will have their own sequences

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
    {name: "CLK", wave: "lhlhlhlhl"},
	{},
	{name: "Main sequencer -> Move", wave: "lh.l....."},
    {},
	{name: "Bus TX", wave: "lh.l.....", node: ".a"},
	{name: "TX ready", wave: "l..h.l...", node: "...b"},
	{name: "(actual data valid)", wave: "l..h..l.."},
	{name: "RX not ready", wave: "l..h.l..."},
	{name: "Bus save CLK", wave: "l...h...l"},
	{name: "Bus save OE", wave: "l....h..l"},
	{name: "Instruction done", wave: "l.......h"}
  ],
  edge: ["a~>b TX Delay (possibly instant)"]
}
```