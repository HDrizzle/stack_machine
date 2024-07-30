# General-purpose RAM

## Internal timing

List of outputs from timing logic:

* Pre-adder latch CLK
* Post-adder latch CLK
* Post-adder latch OE
* Post-adder address A OE to bus
* Post-adder address B OE to bus
* Address A [bus (1) / adder (0)] select / A bus-read CLK
* Address B [bus (1) / adder (0)] select / B bus-read CLK
* Memory write
* Memory read
* Output latch CLK
* Output latch OE
* Input latch CLK
* Input latch OE

### ++addr latch

Clock:
```
	match state {
		0 => (Read ready && A-CLK) || ((Read (Write) || Read (Write ++addr)) && A-CLK),
		1 => !Pre-adder latch CLK
	}
```
Data:
```
	Write (Read ++addr) || Read (Write ++addr)
```

### Write (Read / Read ++addr)

```
{
  signal: [
    {name: "Clk comb.", wave: "p......."},
    {name: "Clk A", wave: "lplplplp"},
    {name: "Clk B", wave: "plplplpl"},
    {},
    {name: "Write (Read / Read ++addr)", wave: "lh...l.."},
    {name: "Read ready", wave: "l.h.l..."},
    {},
    {name: "Post-adder latch CLK", wave: "l..h.l.."},
    {name: "Pre-adder latch CLK", wave: "l...2l..", data: ["++addr"]},
    {name: "Memory read", wave: "lh...l.."},
    {name: "Output latch CLK", wave: "l.h.l..."},
    {name: "Output latch OE", wave: "l.h.l..."}
  ]
}
```

### Write (Read addr A / B)

```
{
  signal: [
    {name: "Clk comb.", wave: "p......."},
    {name: "Clk A", wave: "lplplplp"},
    {name: "Clk B", wave: "plplplpl"},
    {},
    {name: "Write (Read addr A / B)", wave: "lh...l.."},
    {name: "Read ready", wave: "l.h.l..."},
    {},
    {name: "Post-adder address A/B OE to bus", wave: "l.h.l..."}
  ]
}
```

### Read (Write / Write ++addr)

```
{
  signal: [
    {name: "Clk comb.", wave: "p......."},
    {name: "Clk A", wave: "lplplplp"},
    {name: "Clk B", wave: "plplplpl"},
    {},
    {name: "Read (Write / Write ++addr)", wave: "l.h.l..."},
    {},
    {name: "Main bus", wave: "x.2.x...", data: ["data"]},
    {name: "Memory bus", wave: "x..2.x..", data: ["data"]},
    {name: "Post-adder latch CLK", wave: "l...h.l."},
    {name: "Pre-adder latch CLK", wave: "l....2l.", data: ["++addr"]},
    {name: "Memory write", wave: "l...pl.."},
    {name: "Input latch CLK", wave: "l..h.l.."},
    {name: "Input latch OE", wave: "l..h.l.."},
  ]
}
```

### Read (Write addr A / B)

```
{
  signal: [
    {name: "Clk comb.", wave: "p......."},
    {name: "Clk A", wave: "lplplplp"},
    {name: "Clk B", wave: "plplplpl"},
    {},
    {name: "Read (Write addr A / B)", wave: "l.h.l..."},
    {},
    {name: "Main bus", wave: "x.2.x...", data: ["data"]},
    {name: "Memory bus", wave: "x..2.x..", data: ["data"]},
    {name: "Pre-adder latch CLK", wave: "l...h.l."},
    {name: "Address A/B select / A/B bus-read CLK", wave: "l..h.l.."}
  ]
}
```