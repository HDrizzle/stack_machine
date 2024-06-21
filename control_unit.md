# Control unit

## Startup

1. Started by the `Set` input from the bus arbiter going high, which will disable the GOTO latches OE, post-adder latch OE, and the call stack OE. Pullup resistors will set the inputs to the pre-adder latch to 0xFFFF se when it is incremented it starts at instruction 0x0000.
2. Clock pre-adder address latch
3. Begin regular cycle

## Cycle

1. Clock current address from adder into post-adder latch
2. While post-adder latch is enabled, request read from memory
3. When memory read is done, begin instruction based on opcode. NOTE: each instruction sequence is responsible for either: enabling the GOTO latches, popping from the call stack, or enabling the post-adder latch for the pre-adder latch CLK.
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
    {name: "Pre-adder latch CLK", wave: "h.l.......h"},
    {name: "Post-adder latch CLK", wave: "lpl........"},
    {name: "Post-adder latch OE", wave: "lh.l......."},
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
| Call stack - Push | B | A | Call stack |
| Call stack - Pop | B | A | Call stack |
| Call stack - OE | TODO | cont | Call stack |

## Instruction sequences

### MOVE & WRITE

These 2 instructions are performed identically by the control unit timing logic. The bus output latch is clocked by the `program read done` signal and its OE will be controlled by the bus timing logic like all other bus devices.

```
{
  signal: [
    {name: "Clk comb.", wave: "p........"},
    {name: "Clk A", wave: "plplplplp"},
    {name: "Clk B", wave: "lplplplpl"},
    {},
    {name: "Begin cycle", wave: "l.....h.l"},
    {name: "Pre-adder latch CLK", wave: "l.....h.l"},
    {name: "Begin instruction sequence (MOVE/WRITE)", wave: "h.l......"},
    {},
    {name: "Bus arbiter move", wave: "lh.....l."},
    {name: "Bus arbiter move done", wave: "l.|.h.l.."},
    {name: "Post-adder latch OE", wave: "l....h.l."}
  ],
  edge: []
}
```

### GOTO

```
{
  signal: [
    {name: "Clk comb.", wave: "p...."},
    {name: "Clk A", wave: "plplp"},
    {name: "Clk B", wave: "lplpl"},
    {},
    {name: "Begin cycle", wave: "l.h.l"},
    {name: "Pre-adder latch CLK", wave: "l.h.l"},
    {name: "Begin instruction sequence (GOTO)", wave: "h.l.."},
    {},
    {name: "GOTO latches OE", wave: "lhpl."}
  ],
  edge: []
}
```

### GOTO-IF

```
{
  signal: [
    {name: "Clk comb.", wave: "p...."},
    {name: "Clk A", wave: "plplp"},
    {name: "Clk B", wave: "lplpl"},
    {},
    {name: "Begin cycle", wave: "l.h.l"},
    {name: "Pre-adder latch CLK", wave: "l.h.l"},
    {name: "Begin instruction sequence (GOTO-IF)", wave: "h.l.."},
    {},
    {name: "GOTO latches OE", wave: "l2pl.", data: ["DECIDER"]},
    {name: "Post-adder latch OE", wave: "l2pl.", data: ["!DECIDER"]}
  ],
  edge: []
}
```

### HALT

```
{
  signal: [
    {name: "Clk comb.", wave: "p...."},
    {name: "Clk A", wave: "plplp"},
    {name: "Clk B", wave: "lplpl"},
    {},
    {name: "Begin cycle", wave: "l.h.l"},
    {name: "Pre-adder latch CLK", wave: "l.h.l"},
    {name: "Begin instruction sequence (HALT)", wave: "h.l.."},
    {},
    {name: "Post-adder latch OE", wave: "lh.l."},
    {name: "Fault", wave: "lh.l."}
  ],
  edge: []
}
```

### CALL

```
{
  signal: [
    {name: "Clk comb.", wave: "p......"},
    {name: "Clk A", wave: "plplplp"},
    {name: "Clk B", wave: "lplplpl"},
    {},
    {name: "Begin cycle", wave: "l...h.l"},
    {name: "Pre-adder latch CLK", wave: "l...h.l"},
    {name: "Begin instruction sequence (CALL)", wave: "h.l...."},
    {},
    {name: "Post-adder latch OE", wave: "lh.l..."},
    {name: "Call stack - Push", wave: "lh.l..."},
    {name: "GOTO latches OE", wave: "l..npl."}
  ],
  edge: []
}
```

### RETURN

```
{
  signal: [
    {name: "Clk comb.", wave: "p...."},
    {name: "Clk A", wave: "plplp"},
    {name: "Clk B", wave: "lplpl"},
    {},
    {name: "Begin cycle", wave: "l.h.l"},
    {name: "Pre-adder latch CLK", wave: "l.h.l"},
    {name: "Begin instruction sequence (RETURN)", wave: "h.l.."},
    {},
    {name: "Call stack - Pop", wave: "lhpl."},
    {name: "Call stack - OE", wave: "lhpl."}
  ],
  edge: []
}
```