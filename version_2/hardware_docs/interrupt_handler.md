# Hardware Interrupt Handler

TODO: FIX: `Memory source & address counter++` has a glitch during cycle after high interrupt input.

This will be a generic board connected to the bus. Interrupts will be triggered by rising edges, falling edges, timers, and comparators. They can be queued up to as many as 256. Both of the read and write pointers will be incremented AFTER the read/write. When an interrupt is triggered or when the handler returns and there is another one queued up, the normal program instruction will be overridden and the special `CALL` will be run with bit 4 set to 1.

Every interrupt has an 8-bit "code". The first 3 bits address the source of the interrupt, bit 3 is always 0, the last 4 bits vary depending on what the interrupt is. Interrupt sources are as follows:

0. Interrupt timer 0
1. Interrupt timer 1
2. Interrupt timer 2
3. Interrupt timer 3
4. Configurable, +4 bits
5. Configurable, +4 bits
6. Configurable, +4 bits
7. Configurable, +4 bits

The 4 configurable interrupts each correspond to a 5-pin header with the 1st pin being the active-high interrupt signal and the other 4 being the upper 4 bits of the interrupt code. For example 16 buttons could be encoded into the 4 customizable bits with the interrupt pin being triggered by any of them.

## Edge detection

There will be 8 SR latches to remember the state of an interrupt from the previous sample so if an interrupt input goes high for multiple samples there will only be 1 interrupt triggered at the beginning.

## Interface w/ control unit

There will be a single signal to the control unit timing, `Interrupt` which is read on the +clock edge. It will remain high as long as there is at least 1 interrupt in the queue.

## To bus (TX)

12. `INT-CODE` - Oldest interrupt code, will be cleared upon read
13. `INT-COUNT` - 0 to 255, how many interrupts are in the queue

## Timing

Plot sources to be pasted into <a href="wavedrom.com/editor.html">Wavedrom</a>.

Main sequence (independent of computer's sequence)

Pseudocode

```
Loop:
	CLK interrupt address
	CLK current state
	If current state && !prev state:
		CLK write memory counter, Set memory source to write
		Memory write
		Set memory source to read, Current state reset
	Set prev state
	CLK INT-CODE Pre-latch// This must be on -edge to not coincide with the post-latch CLK from bus read
```

Timing diagram (no interrupt)

```
{
  signal: [
    {name: "CLK", wave: "lhlhlhl"},
	{},
    {name: "Interrupt address CLK", wave: "lh.l.h.", node: ".....b"},
    {name: "Current state CLK", wave: "l.h.l.h"},
    {name: "Current state", wave: "l......"},
    {name: "Prev state", wave: "l......"},
    {name: "Memory source (0=read, 1=write)", wave: "l......"},
    {name: "Write address++", wave: "l......"},
    {name: "Memory write", wave: "l......"},
    {name: "Current state reset", wave: "l..hl.."},
    {name: "INT-CODE Pre-latch CLK & Prev state set", wave: "l...hl.", node: "....a"},
  ],
  edge: ["a~>b Begin cycle"]
}
```

Timing diagram (Interrupt)

```
{
  signal: [
    {name: "CLK", wave: "lhlhlhlhl"},
	{},
	{name: "Interrupt address CLK", wave: "lh.l...h.", node: ".......b"},
    {name: "Current state CLK", wave: "l.h.l...h"},
    {name: "Current state", wave: "l.h......"},
    {name: "Prev state", wave: "l.....h.."},
    {name: "Memory source (0=read, 1=write)", wave: "l.h..l..."},
    {name: "Write address++", wave: "l.....hl."},
    {name: "Memory write", wave: "l..hl...."},
    {name: "Current state reset", wave: "l..hl...."},
    {name: "INT-CODE Pre-latch CLK & Prev state set", wave: "l.....hl.", node: "......a"},
  ],
  edge: ["a~>b Begin cycle"]
}
```