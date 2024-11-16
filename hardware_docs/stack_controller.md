# Stack controller hardware description

## Internal timing

As described in the bus timing description in <a href="../timing.md">Timing</a>, all bus-write sequences will be triggered by the B clock and bus-read sequences by the A clock.

Plot sources to be pasted into <a href="wavedrom.com/editor.html">Wavedrom</a>.

### Pop

```
{
  signal: [
    {name: "Clk comb.", wave: "p......."},
    {name: "Clk A", wave: "lplplplp"},
    {name: "Clk B", wave: "plplplpl"},
    {},
    {name: "Read", wave: "l.h.l..."},
    {name: "Write (Pop)", wave: "lh...l.."},
    {name: "Read ready", wave: "l.h.l..."},
    {},
    {name: "Main bus", wave: "x.2.x...", data: ["data"]},
    {name: "Memory bus", wave: "x2...x..", data: ["data"]},
    {name: "Adder input latch clock", wave: "l.h.l..."},
    {name: "Memory output enable", wave: "lh...l.."},
    {name: "Output latch clock", wave: "l.h.l..."},
    {name: "Output latch output enable", wave: "l.h.l..."},
    {name: "Pointer latch clock", wave: "l...h.l."},
    {name: "Pointer ++(0) / -- (1)", wave: "lh...l.."}
  ]
}
```
### Push
```
{
  signal: [
    {name: "Clk comb.", wave: "p......."},
    {name: "Clk A", wave: "lplplplp"},
    {name: "Clk B", wave: "plplplpl"},
    {},
    {name: "Read (Push)", wave: "l.h.l..."},
    {name: "Write", wave: "lh...l.."},
    {name: "Read ready", wave: "l.h.l..."},
    {},
    {name: "Main bus", wave: "x.2.x...", data: ["data"]},
    {name: "Memory bus", wave: "x..2.x..", data: ["data"]},
    {name: "Adder input latch clock", wave: "l..pl..."},
    {name: "Input latch clock", wave: "l..pl..."},
    {name: "Input latch output enable", wave: "l...h.l."},
    {name: "Pointer latch clock", wave: "l...h.l."},
    {name: "Memory write enable", wave: "l....pl."}
  ]
}
```
### Offset write
```
{
  signal: [
    {name: "Clk comb.", wave: "p......."},
    {name: "Clk A", wave: "lplplplp"},
    {name: "Clk B", wave: "plplplpl"},
    {},
    {name: "Read (Offset write)", wave: "l.h.l..."},
    {name: "Write", wave: "lh...l.."},
    {name: "Read ready", wave: "l.h.l..."},
    {},
    {name: "Main bus", wave: "x.2.x...", data: ["data"]},
    {name: "Memory bus", wave: "x..2.x..", data: ["data"]},
    {name: "Adder input latch clock", wave: "l..pl..."},
    {name: "Input latch clock", wave: "l..pl..."},
    {name: "Input latch output enable", wave: "l...h.l."},
    {name: "Pointer latch clock", wave: "l......."},
    {name: "Memory write enable", wave: "l....pl."},
    {name: "ToS (0) / Offset (1) select", wave: "l...h.l."}
  ]
}
```
### Offset read
```
{
  signal: [
    {name: "Clk comb.", wave: "p......."},
    {name: "Clk A", wave: "lplplplp"},
    {name: "Clk B", wave: "plplplpl"},
    {},
    {name: "Read", wave: "l.h.l..."},
    {name: "Write (Offset read)", wave: "lh...l.."},
    {name: "Read ready", wave: "l.h.l..."},
    {},
    {name: "Main bus", wave: "x.2.x...", data: ["data"]},
    {name: "Memory bus", wave: "x2...x..", data: ["data"]},
    {name: "Adder input latch clock", wave: "l.h.l..."},
    {name: "Memory output enable", wave: "lh...l.."},
    {name: "Output latch clock", wave: "l.h.l..."},
    {name: "Output latch output enable", wave: "l.h.l..."},
    {name: "Pointer latch clock", wave: "l......."},
    {name: "ToS (0) / Offset (1) select", wave: "lh...l.."}
  ]
}
```
### Set stack offset
```
{
  signal: [
    {name: "Clk comb.", wave: "p......."},
    {name: "Clk A", wave: "lplplplp"},
    {name: "Clk B", wave: "plplplpl"},
    {},
    {name: "Read (Set stack offset)", wave: "l.h.l..."},
    {name: "Write", wave: "lh...l.."},
    {name: "Read ready", wave: "l.h.l..."},
    {},
    {name: "Main bus", wave: "x.2.x...", data: ["data"]},
    {name: "Offset latch clock", wave: "l..pl..."}
  ]
}
```