# Control unit

https://lucid.app/lucidchart/32ad8e9d-d2d1-47b0-a4b6-105ece57e4e0/edit?viewport_loc=-87%2C-294%2C1954%2C1174%2C0_0&invitationId=inv_57dea9bb-0ba1-45a8-8f8a-2a729ad6f8bd

Plot sources to be pasted into <a href="wavedrom.com/editor.html">Wavedrom</a>.

## Startup

1. Started by the `Set` input from the startup controller going high, the sequencer `Start` input will go high for exactly 1 cycle (update on -edge). `Start` will disable the GOTO latches OE, post-adder latch OE, and the call stack OE. Pullup resistors will set the inputs to the pre-adder latch to 0xFFFF so when it is incremented it starts at instruction 0x0000.
2. Clock pre-adder address latch
3. Clock post-adder address latch
3. Begin regular cycle

```
{
  signal: [
	{name: "CLK", wave: "lhlhlh"},
	{},
    {name: "Enable", wave: "lh...."},
    {name: "Start", wave: "l.h.l."},
	{name: "Pre-adder latch CLK", wave: "l.h.l."},
    {name: "Load Instruction", wave: "l..h.l"}
  ],
	edge: ["a~>b Wait for instruction done"]
}
```

## Cycle, PC incrementation may be done in parallel

There will be an SR latch `Instruction done` which will be read on +edge to continue with `Begin instruction sequence` for the next instruction.

Load from FLash
```
{
  signal: [
	{name: "CLK", wave: "lhlhlhl"},
	{},
    {name: "Load Instruction", wave: "lh.l..."},
	{name: "Post-adder latch CLK & OE", wave: "lh.l..."},
	{name: "Flash read (PC MSB=0)", wave: "lh.l..."},
    {name: "Instruction pre-latches CLK", wave: "l.h.l..", node: "..a"},
	{name: "Instruction post-latch CLK", wave: "l..h.l.", node: "...b"},
	{name: "Begin instruction sequence", wave: "l..h.l."},
    {name: "Instruction done", wave: "l.hl2..", data: ["flow-ctrl"]}
  ],
	edge: ["a~>b Wait for instruction done"]
}
```

The `Instruction load possible` signal is combinational from the GPRAM sharing circuit and the PC MSB. If the PC MSB = 0 then it is always 1, otherwise it depends on the PC MSB, the GPRAM MSB, and whether the GPRAM is being used.

If at any time during an instruction load, the `Instruction load possible` signal goes low (only will happen from GPRAM usage, always +edge), then the timing chain must loop back into the waiting loop (`Load Instruction`) for it to go high again.

Load from RAM (non delayed)
```
{
  signal: [
	{name: "CLK", wave: "lhlhlhlh"},
	{},
    {name: "Load Instruction", wave: "lh.l...."},
	{name: "Post-adder latch CLK & OE", wave: "lh...l.."},
	{name: "RAM read (PC MSB=1)", wave: "lh...l.."},
    {name: "Instruction load possible (read on -edge)", wave: "xh......"},
	{name: "RAM LSB", wave: "l..h.l.."},
	{name: "Instruction pre-latch A CLK", wave: "l.h.l..."},
	{name: "Instruction pre-latch B CLK", wave: "l...h.l.", node: "....a"},
	{name: "Instruction post-latch CLK", wave: "l....h.l", node: ".....b"},
	{name: "Begin instruction sequence", wave: "l....h.l"},
    {name: "Instruction done", wave: "l...hl2.", data: ["flow-ctrl"]}
  ],
	edge: ["a~>b Wait for instruction done"]
}
```

Load from RAM, start delayed
```
{
  signal: [
	{name: "CLK", wave: "lhlhlhlhlh"},
	{},
    {name: "Load Instruction", wave: "lh.l......"},
	{name: "Post-adder latch CLK & OE", wave: "lh.....l.."},
	{name: "RAM read (PC MSB=1)", wave: "lh.....l.."},
    {name: "Instruction load possible (read on -edge)", wave: "l..h......"},
	{name: "RAM LSB", wave: "l....h.l.."},
	{name: "Instruction pre-latch A CLK", wave: "l...h.l..."},
	{name: "Instruction pre-latch B CLK", wave: "l.....h.l.", node: "......a"},
	{name: "Instruction post-latch CLK", wave: "l......h.l", node: ".......b"},
	{name: "Begin instruction sequence", wave: "l......h.l"},
    {name: "Instruction done", wave: "l.....hl2.", data: ["flow-ctrl"]}
  ],
	edge: ["a~>b Wait for instruction done"]
}
```

## Interrupts

The signal `Interrupt` from the interrupt handler is read on the positive edge and used to determine whether `Instruction post-latch OE` is set. The instruction data bus has pull up/down resistors to hardcode the default value to the interruot call instruction (0x0015) so when the `Instruction post-latch OE` is low then the interrupt handler will be called.

The interrupt call can only happen when `Interrupt in-progress` is low and `Interrupt enabled` is high. `Interrupt enabled` is an SR latch which is set by:

 * The `CALL` (disable) and `RETURN` (enable) instructions if bit 4 is high (interrupts are automatically disabled when in the interrupt handler or any function calls within it)
 * Disabled on startup
 * The `CONFIG-INT` instruction will enable or disable interrupts. This should not be used inside the interrupt handler except in some kind of weird use case I can't think of.

```
{
  signal: [
	{name: "CLK", wave: "lhlhlhl"},
	{},
    {name: "Load Instruction", wave: "lh.l..."},
	{name: "Post-adder latch CLK & OE", wave: "lh.l..."},
	{name: "Flash read (PC MSB=0)", wave: "lh.l..."},
    {name: "Instruction pre-latches CLK", wave: "l.h.l..", node: "..a"},
	{name: "Instruction post-latch CLK", wave: "l..h.l.", node: "...b"},
	{name: "Instruction post-latch OE", wave: "h..l.h."},
	{name: "Interrupt (latched on +edge)", wave: "x.h...."},
	{name: "Interrupt in-progress", wave: "l...h.."},
	{name: "Begin instruction sequence", wave: "l..h.l."},
    {name: "Instruction done", wave: "l.hl2..", data: ["flow-ctrl"]}
  ],
	edge: ["a~>b Wait for instruction done"]
}
```

## Non-control-flow parallel PC++

```
{
  signal: [
	{name: "CLK", wave: "lhlhlh"},
	{},
	{name: "Begin instruction sequence (non-flow-ctrl)", wave: "lh.l.."},
	{name: "Post-adder latch OE", wave: "lh.l.."},
	{name: "Pre-adder latch CLK", wave: "l.h.l."},
    {name: "Load Instruction", wave: "l..h.l"}
  ],
	edge: []
}
```

## Instruction sequences

NOTE: Even flow-control instructions must set "Instruction Done" high again so that the "Load instruction" sequence will continue to load the new instruction w/o being deadlocked.

### MOVE & WRITE

Refer to "bus.md" for move timing

Fastest possible case
```
{
  signal: [
    {name: "CLK", wave: "lhlhl"},
	{},
	{name: "Begin instruction sequence (MOVE/WRITE)", wave: "lh.l."},
	{},
    {name: "Bus move", wave: "lh.l.", node: ".a"},
    {name: "Move done", wave: "l...h", node: "....b"},
	{name: "Instruction done", wave: "l...h"}
  ],
  edge: ["a~>b Move delay"]
}
```

### GOTO (flow-control)

```
{
  signal: [
    {name: "CLK", wave: "lhlhl"},
	{},
	{name: "Begin instruction sequence (GOTO)", wave: "lh.l."},
	{},
	{name: "GOTO latches OE", wave: "lh.l."},
	{name: "Pre-adder latch CLK", wave: "l.h.l"},
    {name: "Load Instruction", wave: "l..h."}
  ],
  edge: []
}
```

### GOTO-IF (flow-control)

```
{
  signal: [
    {name: "CLK", wave: "lhlhl"},
	{},
	{name: "Begin instruction sequence (GOTO-IF)", wave: "lh.l."},
	{},
	{name: "GOTO latches OE", wave: "l2.l.", data: ["DECIDER"]},
	{name: "Post-adder latch OE", wave: "l2.l.", data: ["!DECIDER"]},
	{name: "Pre-adder latch CLK", wave: "l.h.l"},
    {name: "Load Instruction", wave: "l..h."}
  ],
  edge: []
}
```

### HALT

```
{
  signal: [
    {name: "CLK", wave: "lhlh"},
	{},
	{name: "Begin instruction sequence (HALT)", wave: "lh.l"},
	{name: "Instruction done", wave: "l.h."}
  ],
  edge: []
}
```

### CALL (flow-control)

```
{
  signal: [
    {name: "CLK", wave: "lhlhlhlhl"},
	{},
	{name: "Begin instruction sequence (CALL)", wave: "lh.l....."},
	{},
	{name: "Call stack - Push", wave: "lh.l....."},
    {name: "Interrupt in-progress", wave: "l.2......", data: ["Bit 4"]},
	{name: "Post-adder latch OE", wave: "l.h..l..."},
	{name: "GOTO latches OE", wave: "l....h.l."},
	{name: "Pre-adder latch CLK", wave: "l.....h.l"},
    {name: "Load Instruction", wave: "l......h."}
  ],
  edge: []
}
```

### RETURN (flow-control)

```
{
  signal: [
    {name: "CLK", wave: "lhlhl"},
	{},
	{name: "Begin instruction sequence (RETURN)", wave: "lh.l."},
	{},
	{name: "Call stack - Pop & OE", wave: "lh.l."},
    {name: "Interrupt in-progress", wave: "h.2..", data:["!Bit 4"]},
	{name: "Pre-adder latch CLK", wave: "l.h.l"},
    {name: "Load Instruction", wave: "l..h."}
  ],
  edge: []
}
```

### CONFIG-INT

```
{
  signal: [
    {name: "CLK", wave: "lhlhl"},
	{},
	{name: "Begin instruction sequence (CONFIG-INT)", wave: "lh.l."},
	{},
	{name: "Interrupt enabled S / R", wave: "l.h.l"},
	{name: "Instruction done", wave: "l.h.."}
  ],
  edge: []
}
```