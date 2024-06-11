# Control unit

## Startup

1. Started by the `Set` input from the bus arbiter going high
2. Clock pre-adder address latch
3. Begin regular cycle

## Cycle

1. Clock current address from adder into post-adder latch
2. While post-adder latch is enabled, request read from memory
3. When memory read is done, begin instruction based on opcode. NOTE: each instruction sequence is responsible for clocking the pre-adder addres latch
4. When instruction is done, repeat.

Wavedrom source:
```
{
  signal: [
    {name: "Clk comb.", wave: "p.........."},
    {name: "Clk A", wave: "plplplplplp"},
    {name: "Clk B", wave: "lplplplplpl"},
    {},
    {name: "Begin cycle", wave: "h.l......|h", node: "..........d"},
    {name: "Post-adder latch CLK", wave: "lpl........"},
    {name: "Post-adder latch enable", wave: "lh.l......."},
    {name: "Memory read", wave: "lh.l.......", node: "..a"},
    {name: "Memory read done", wave: "l..|h.l....", node: "....b"},
    {},
    {name: "Begin instruction sequence", wave: "l...h.l....", node: ".....c"}
  ],
  edge: ["a~>b Memory delay", "c~>d Instruction sequence"]
}
```

## Inputs to timing (excluding bus)

| Name | Set by | Clock set | Clock read |
| - | - | - | - |
| Bus arbiter done | Bus arbiter | A | B |
| Program read done | Program memory | A | B |
| Set | Bus arbiter | A | cont |

## Outputs from timing (excluding bus)

| Name | Clock set | Clock read | Read by |
| - | - | - | - |
| Bus arbiter move | B | A | Bus arbiter |
| Pre-adder address latch CLK | TODO | none | Pre-adder address latch |
| Post-adder address latch CLK | TODO | none | Post-adder address latch |
| Post-adder address latch enable | TODO | none | Post-adder address latch |
| Program read | B | A | Program memory |
| Call stack - Push | TODO | TODO | Call stack |
| Call stack - Pop | TODO | TODO | Call stack |
| Call stack - OE | TODO | cont | Call stack |