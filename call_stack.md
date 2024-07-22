# Call stack

The call stack will be a 256 x 16 bit stack memory reading inputs on the A clock and connected to the control unit for storing and retrieving return addresses for the `CALL` and `RETURN` instructions. For memory chips it will have 2 32k x 8 bit memories wired in parellel (for 16-bit word size). Since only 256 words will be needed, the extra addresses will be tied to GND. It may be expanded in the future.

## Timing

### Push

```
{
  signal: [
    {name: "Clk comb.", wave: "p......"},
    {name: "Clk A", wave: "plplplp"},
    {name: "Clk B", wave: "lplplpl"},
    {},
    {name: "Push", wave: "lh.l..."},
    {name: "Input latch CLK", wave: "l.h.l.."},
    {name: "Pre-adder latch CLK", wave: "l.h.l.."},
    {name: "Post-adder latch CLK", wave: "l..h.l."},
    {name: "Input latch OE", wave: "l..h.l."},
    {name: "Write", wave: "l...pl."}
  ],
  edge: []
}
```

### Pop

```
{
  signal: [
    {name: "Clk comb.", wave: "p......"},
    {name: "Clk A", wave: "plplplp"},
    {name: "Clk B", wave: "lplplpl"},
    {},
    {name: "Pop", wave: "lhpl..."},
    {name: "Read", wave: "lhpl..."},
    {name: "Output latch CLK", wave: "lnhpl.."},
    {name: "Pre-adder latch CLK", wave: "l.h.l.."},
    {name: "Post-adder latch CLK", wave: "l..h.l."},
    {name: "Inc (0) / Dec (1) select", wave: "l.h.l.."}
  ],
  edge: []
}
```