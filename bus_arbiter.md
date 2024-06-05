# Bus arbiter

The bus arbiter will read its control signals from the control unit during the A clock, therefore the control unit will use the B clock to comminicate with it.

These are the control lines between the control unit and the bus arbiter:
| Line(s) | Controlled by | Clock set | Read by | Clock read |
| - | - | - | - | - |
| Move | Control unit | B | Bus arbiter | A |
| Write address | Control unit | B | Bus arbiter | A |
| Read address | Control unit | B | Bus arbiter | A |
| Done | Bus arbiter | A | Control unit | B |

Wavedrom source for normal bus transfer
```
{
  signal: [
    {name: "Clk comb.", wave: "p........"},
    {name: "Clk A", wave: "plplplplp"},
    {name: "Clk B", wave: "lplplplpl", node: "...a"},
    {},
    {name: "Move", wave: "lh.....l.", node: ".......d"},
    {name: "Write address", wave: "x2.....x.", data: ["A0 - A3"]},
    {name: "Read address", wave: "x2.....x.", data: ["A0 - A3"]},
    {name: "Done", wave: "l.....h.l", node: "......c"},
    {},
    {name: "Read", wave: "l....h.l."},
    {name: "Write", wave: "l.h.....l"},
    {name: "Read ready", wave: "l....h.l.", node: ".....b"},
    {name: "D0 - D7", wave: "x....2.x.", data: ["data"]}
  ],
  edge: ['a~>b Writing device delay', 'c~>d']
}
```

## Same device read/write

There will be times when it is convenient or necessary for the same device to write to the bus and simultaneously read from it. That may cause issues with internal timing that will likely be hard to engineer around. For this reason the bus arbiter will have a feature to send the write signal, store the bus value, wait, and then send the stored bus value by asserting the read signal 2 B-clock periods later then normal. This will only happen if the reading and writing device is the same.

Wavedrom source for delayed bus transfer
```
{
  signal: [
    {name: "Clk comb.", wave: "p............"},
    {name: "Clk A", wave: "plplplplplplp"},
    {name: "Clk B", wave: "lplplplplplpl", node: "...a"},
    {},
    {name: "Move", wave: "lh.........l.", node: "...........d"},
    {name: "Write address", wave: "x2.........x.", data: ["A0 - A3"]},
    {name: "Read address", wave: "x2.........x.", data: ["A0 - A3"]},
    {name: "Done", wave: "l.........h.l", node: "..........c"},
    {},
    {name: "Data save latch clock", wave: "l.....pl....."},
    {name: "Data save latch output enable", wave: "l........h.l."},
    {},
    {name: "Read", wave: "l........h.l.", node: ".........e"},
    {name: "Write", wave: "l.h.....l...."},
    {name: "Read ready", wave: "l....h.l.....", node: ".....b"},
    {name: "D0 - D7", wave: "x....2.x.2.x.", data: ["data", "data"]}
  ],
  edge: ['a~>b Writing device delay', 'c~>d', 'b~>e 2 B-clock cycles']
}
```