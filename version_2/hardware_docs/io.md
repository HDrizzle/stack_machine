# IO Controller

The GPIO pins will consust of:
* 2 8-bit inputs (`GPIO-READ-A` and `GPIO-READ-B`)
* For each input: A signal `[A/B] Wait to read` which gives external logic the option to delay clocking the input latch. Data should be valid by the rising edge when the signal goes low.
* 2 8-bit outputs (`GPIO-WRITE-A` and `GPIO-WRITE-B`)
* 2 Corresponding signals which are set high for 1 cycle after either of the outputs are updated.

## Timing

Plot sources to be pasted into <a href="wavedrom.com/editor.html">Wavedrom</a>.

### GPIO write (RX)

```
{
  signal: [
    {name: "CLK", wave: "lhlhlh"},
	{},
	{name: "RX (GPIO Write A/B)", wave: "lh.l.."},
    {},
    {name: "A/B Out CLK", wave: "l.h.l."},
    {name: "A/B out updated", wave: "l..h.l"}
  ]
}
```

### GPIO Read (TX)

Non-delayed case
```
{
  signal: [
    {name: "CLK", wave: "lhlhl"},
	{},
	{name: "TX (GPIO Read A/B)", wave: "lh.l."},
	{name: "TX ready", wave: "lh.l."},
    {},
    {name: "A/B About to read", wave: "lh.l."},
    {name: "A/B Wait to read", wave: "l...."},
    {name: "A/B In CLK & OE -> Bus", wave: "lh.2l", data: ["RX Extend"]}
  ]
}
```

Delayed by external logic
```
{
  signal: [
    {name: "CLK", wave: "lhlhl.."},
	{},
	{name: "TX (GPIO Read A/B)", wave: "lh.l..."},
	{name: "TX ready", wave: "l..h.l."},
    {},
    {name: "A/B About to read", wave: "lh.l..."},
    {name: "A/B Wait to read", wave: "lh|l..."},
    {name: "A/B In CLK & OE -> Bus", wave: "l..h.2l", data: ["RX Extend"]}
  ]
}
```