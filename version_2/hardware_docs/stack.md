# The Stack Memory

2^15 levels, different RAM then the PC and GPRAM.

At "rest" the post-adder latch (connected to memory address) is pointing to the element at the ToS. This means a pop can be OE'd to the bus immediately but a push has to wait for the pointer to be incremented.

Plot sources to be pasted into <a href="wavedrom.com/editor.html">Wavedrom</a>.

### Pop (TX)

```
{
  signal: [
    {name: "CLK", wave: "lhlhlhl"},
	{},
    {name: "TX (Pop)", wave: "lh.l..."},
	{name: "TX ready", wave: "lh.l..."},
    {},
    {name: "Pre-adder latch CLK", wave: "lh.l..."},
    {name: "Memory output enable", wave: "lh.2l..", data: ["RX Extend"]},
    {name: "Post-adder latch CLK", wave: "l...h.l"},
    {name: "Pointer ++(0) / -- (1)", wave: "l..h.l."}
  ]
}
```

### Push (RX)

```
{
  signal: [
    {name: "CLK", wave: "lhlhlhl"},
	{},
	{name: "RX (Push)", wave: "lh.l..."},
	{name: "RX not ready", wave: "lh.l..."},
	{name: "RX extend half cycle", wave: "l..h.l."},
    {},
    {name: "Pre-adder latch CLK", wave: "lh.l..."},
    {name: "Post-adder latch CLK", wave: "l.h.l.."},
    {name: "Memory write enable", wave: "l...hl."},
    {name: "Pointer ++(0) / -- (1)", wave: "l......"}
  ]
}
```

### Offset write (RX)

```
{
  signal: [
    {name: "CLK", wave: "lhlhl"},
	{},
	{name: "RX (Offset write)", wave: "lh.l."},
	{name: "RX extend half cycle", wave: "lh.l."},
    {},
    {name: "Memory write enable", wave: "l.hl."},
    {name: "ToS (0) / Offset (1) select", wave: "lh..l"}
  ]
}
```

### Offset read (TX)

```
{
  signal: [
    {name: "CLK", wave: "lhlhl"},
	{},
    {name: "TX (Offset read)", wave: "lh.l."},
	{name: "TX ready", wave: "lh.l."},
    {},
    {name: "Memory output enable", wave: "lh.2l", data: ["RX Extend"]},
    {name: "ToS (0) / Offset (1) select", wave: "lh.2l", data: ["RX Extend"]}
  ]
}
```

### Set stack offset (RX)

```
{
  signal: [
    {name: "CLK", wave: "lhlhl"},
	{},
	{name: "RX (Set offset)", wave: "lh.l."},
    {},
    {name: "Offset latch CLK", wave: "l.h.l"}
  ]
}
```

### Get stack offset (TX)

```
{
  signal: [
    {name: "CLK", wave: "lhlhl"},
	{},
	{name: "TX (Get offset)", wave: "lh.l."},
	{name: "TX ready", wave: "lh.l."},
    {},
    {name: "Offset latch OE -> Bus", wave: "lh.2l", data: ["RX Extend"]}
  ]
}
```