# 32 x 32 LED matrix display

Each LED is either on or off

To write to display: Set the 16 bit input so that the first 8 bits address a "byte" of "data" to write to on the display (LSB-to-MSB left-to-right).
Specifically, the bits 0 - 1 address the column and bits 2 - 6 address the row. Bit 7 does nothing.

Each column is 8 bits/pixels wide and is set on a row all at once with bits 8 - 15.

## Memory

2x 32k x 8 SRAM chips in parallel for 32k 16-bit words.
Usage (read): 64 x 16
Usage (write): 128 x 8

## Display loop

For each iteration, 1024/16 = 64 words will be accessed. Each of the 8 drivers will use 1 word per row activation.

### For each row activation (0 - 7)

Every bit in each 16-bit word should be used during the same multiplex iteration.
For each LED driver: Load in the 16-bit word located at address `(floor(driver / 2) * 16) + (driver % 2) + (2 * row_activation)`, this can be implemented easily by concatenating the bits of each term together.
Set the row source from previous row to this one.

## LED drivers

1024 x 20 mA per LED / 8 for multiplexing is 2.5 A, at 5 volts thats 12.5 W!! (new screen metric just dropped: 12.5 mW/pixel)
Going to use high-side N-channel enhancement MOSFET switches. Update: using the IRF9540.

## Timing

The logic will represent a for loop like so:
```
for row_activation in 0..8 {
  Pulse LE
	for driver in 0..8 {
		Set memory address
		Get 16-bit word
		for bit_address in 0..16 {
			Clock bit into driver
		}
		Update driver latch
		Load latest written address/data into memory (this isn't necessary but is simpler then having another piece of logic that only updates on input update)
	}
}
```

Since each variable iterates over a power of two, all 3 counters will just loop over. There is no need to explicitely reset them because that will happen on startup. The bit address counter is driven by the main clock anded with the `Bit address counter enable` signal.

LED driver updating, representing the pseudo-code inside the `for driver in 0..8` for-loop.
NOTE: The clock pulse that brings the counter from 15 to 0 will be really small since it will be disabled when the counter overflows, although this cannot be represented with the diming diagram, it won't be a race condition.
```
{
  signal: [
    {name: "CLK", wave: "p|.......|"},
    {},
    {name: "Memory read", wave: "l|..h.l..|"},
    {name: "Memory output latch CLK", wave: "l|...hl..|"},
    {name: "Bit address", wave: "2222..2222", data: ["13", "14", "15", "0", "1", "2", "3", "4"]},
    {name: "Driver address", wave: "2..2......", data: ["7", "0"], node: "...a"},
    {name: "Counter enable", wave: "h|.l..h..|"},
    {name: "Counter CLK", wave: "p|..l.p..|"},
    {name: "Driver CLK enable", wave: "h|.l.nh..|"},
    {name: "Driver CLK", wave: "n|.l.nn..|"},
    {name: "Driver LE", wave: "l|.hl....|", node: "...b"},
    {},
    {name: "Memory write set data", wave: "l|....h.l|"},
    {name: "Memory write", wave: "l|.....pl|"},
  ],
  edge:['a~>b causes']
}
```
I made sure there is a time gap between when the counter rolls over and when `Momery read` goes high because I don't know whether the memory read is edge or level triggered.

The `Memory write set data` signal will control some further combinational logic as follows:
* Low: the read address transparent latch is enabled
* High: The data input address latch is enabled, one of the data input data latches is enabled depending on the LSB of the address.

The `Memory write` should only write to one of the memory chips based on the LSB of the data address, just like the two data latches.

https://pdftobrainrot.org/share/072650e9ef6a43f492dbb5a2f9bec8e8