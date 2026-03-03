# General Purpose RAM (GPRAM)

There will be no input/output latches like in the previous version

List of outputs from timing logic (excluding bus):

* Pre-adder latch CLK
* Post-adder latch CLK
* Pre-adder address A OE to bus
* Pre-adder address B OE to bus
* Address A [bus (1) / adder (0)] select & Bus -> A OE
* Address B [bus (1) / adder (0)] select & Bus -> B OE
* Memory write (write happens on WE disable-edge)
* Memory read

## Timing

Plot sources to be pasted into <a href="wavedrom.com/editor.html">Wavedrom</a>.

The `Prog read disable` signal makse sure that the `Instruction load possible` signal to the main sequencer is only updated on the +edge of the clock.

The `Pre-adder latch CLK` outputs for "TX (Read / Read ++addr)" and "RX (Write / Write ++addr)" will be OR'ed together then put through an edge detector so as not to interfere with the shorter sequences whenever there is a 2-CLK-cycle instruction cycle.

Seperate A and B pre adder latch clocks are used when loading from the bus so the other latch doesn't clock data from the post adder latch.

Same device TX/RX resolution: When the GPRAM controller is both the bus source and destination, the destination sequence will be delayed for 2 clock cycles. For those 2 cycles the `RX Not Ready` signal to the bus controller will be set high to save the bus state.

### TX (Read / Read ++addr)

```
{
  signal: [
    {name: "CLK", wave: "lhlhlhl"},
	{},
	{name: "TX (Read / Read ++addr)", wave: "lh.l..."},
	{name: "TX ready", wave: "lh.l..."},
    {},
    {name: "Post-adder latch CLK", wave: "l.h.l.."},
    {name: "Pre-adder latch CLK", wave: "l...l..", node: "....ab"},
    {name: "Memory read", wave: "lh.2l..", data: ["RX Extend"]},
    {name: "Prog read disable", wave: "l..2.l.", data: ["RX Extend"]}
  ],
  "edge": ["a~>b ++addr"]
}
```

### TX (Read addr A / B)

```
{
	signal: [
		{name: "CLK", wave: "lhlhl"},
	{},
		{name: "TX (Read addr A / B)", wave: "lh.l."},
	{name: "TX ready", wave: "lh.l."},
		{},
		{name: "Pre-adder address A/B OE to bus", wave: "lh.2l", data: ["RX Extend"]}
	]
}
```

### RX (Write / Write ++addr)

```
{
  signal: [
    {name: "CLK", wave: "lhlhlhlh"},
	{},
    {name: "RX (Write / Write ++addr)", wave: "lh.l...."},
	{name: "RX extend half cycle", wave: "lh.l...."},
    {},
    {name: "Post-adder latch CLK", wave: "l...h.l."},
    {name: "Pre-adder latch CLK", wave: "l....l..", node: ".....ab"},
    {name: "Memory prepare to write", wave: "lh..l..."},
    {name: "Prog read disable", wave: "l..h.l.."},
    {name: "Memory write", wave: "l.hl...."}
  ],
  "edge": ["a~>b ++addr"]
}
```

### RX (Write addr A / B)

```
{
	signal: [
		{name: "CLK", wave: "lhlhl"},
	{},
		{name: "RX (Write addr A / B)", wave: "lh.l."},
		{},
		{name: "Pre-adder latch CLK", wave: "l.h.l"},
		{name: "Address A/B select & Bus -> A/B OE", wave: "lh.l."}
	]
}
```