This file has all the source code for rendering timing diagrams on Wavedrom. Documentation at https://wavedrom.com/images/SNUG2016_WaveDrom.pdf

# Bus timing

```
{
  signal: [
    {name: "Clk comb.", wave: "p......."},
    {name: "Clk A", wave: "lplplplp"},
    {name: "Clk B", wave: "plplplpl", node: "..a"},
    {},
    {name: "Read", wave: "l...h.l."},
    {name: "Write", wave: "lh.....l"},
    {name: "Read ready", wave: "l...h.l.", node: "....b"},
    {name: "D0 - D7", wave: "x...2.x.", data: ["data"]}
  ],
  edge: ['a~>b Writing device delay']
}
```

# Stack controller internal timing

## Pop

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
    {name: "Adder input latch clock", wave: "l.pl...."},
    {name: "Memory output enable", wave: "lh...l.."},
    {name: "Output latch clock", wave: "l.pl...."},
    {name: "Output latch output enable", wave: "l.h.l..."},
    {name: "Pointer latch clock", wave: "l...pl.."}
  ]
}
```
## Push
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
    {name: "Memory bus", wave: "x.2...x..", data: ["data"]},
    {name: "Adder input latch clock", wave: "l.pl...."},
    {name: "Input latch clock", wave: "l.pl...."},
    {name: "Input latch output enable", wave: "l.h.l..."},
    {name: "Pointer latch clock", wave: "l...pl.."},
    {name: "Memory write enable", wave: "l..pl..."}
  ]
}
```