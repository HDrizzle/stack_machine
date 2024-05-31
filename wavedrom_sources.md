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