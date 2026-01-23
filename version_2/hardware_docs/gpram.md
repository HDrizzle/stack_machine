# General Purpose RAM (GPRAM)

There will be no input/output latches like in the previous version

List of outputs from timing logic (excluding bus):

* Pre-adder latch CLK
* Post-adder latch CLK
* Post-adder latch OE
* Pre-adder address A OE to bus
* Pre-adder address B OE to bus
* Address A [bus (1) / adder (0)] select & Bus -> A OE
* Address B [bus (1) / adder (0)] select & Bus -> B OE
* Memory write (write happens on WE disable-edge)
* Memory read

### TX (Read / Read ++addr)

Plot sources to be pasted into <a href="wavedrom.com/editor.html">Wavedrom</a>.

```
{
  signal: [
    {name: "CLK", wave: "lhlhlhl"},
	{},
	{name: "TX (Read / Read ++addr)", wave: "lh.l..."},
	{name: "TX ready / OE", wave: "lh..l.."},
    {},
    {name: "Post-adder latch CLK", wave: "l.h.l.."},
    {name: "Pre-adder latch CLK", wave: "l...2.l", data: ["++addr"]},
    {name: "Memory read", wave: "lh..l.."}
  ]
}
```

### TX (Read addr A / B)

```
{
  signal: [
    {name: "CLK", wave: "lhlhl"},
	{},
    {name: "TX (Read addr A / B)", wave: "lh.l."},
	{name: "TX ready / OE", wave: "lh..l"},
    {},
    {name: "Pre-adder address A/B OE to bus", wave: "lh..l"}
  ]
}
```

### RX (Write / Write ++addr)

```
{
  signal: [
    {name: "CLK", wave: "lhlhlhl"},
	{},
    {name: "TX ready (Write / Write ++addr)", wave: "lh.l..."},
    {},
    {name: "Post-adder latch CLK", wave: "l..h.l."},
    {name: "Pre-adder latch CLK", wave: "l...2.l", data: ["++addr"]},
    {name: "Memory write", wave: "lhl...."}
  ]
}
```

### RX (Write addr A / B)

```
{
  signal: [
    {name: "CLK", wave: "lhlhl"},
	{},
    {name: "TX ready (Write addr A / B)", wave: "lh.l."},
    {},
    {name: "Pre-adder latch CLK", wave: "l.h.l"},
    {name: "Address A/B select & Bus -> A/B OE", wave: "lh.l."}
  ]
}
```