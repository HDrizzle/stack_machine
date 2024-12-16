# 32 x 32 LED matrix display

Each LED is either on or off

To write to display: Set the 16 bit input so that the first 8 bits address a "byte" of "data" to write to on the display.
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
For each LED driver: Load in the 16-bit word located at address `row_activation + (driver * 8)`
Set the row source from previous row to this one.

## LED drivers

1024 x 20 mA per LED is 20 A (a bit more then 1 A per driver), at 5 volts thats 100 W!! (new screen metric just dropped: 0.1 W/pixel)
Going to use high-side MOSFET switches, havent't figured out exact type yet.

## Timing

The logic will represent a for loop like so:
```
for row_activation in 0..8 {
	for driver in 0..8 {
		Set memory address
		Get 16-bit word
		for bit_address in 0..16 {
			Clock bit into driver
		}
		Update driver latch
	}
}
```

Since each variable iterates over a power of two, all 3 counters will just loop over. There is no need to explicitely reset them because that will happen on startup. The bit address counter is driven by the main clock anded with the `Bit address counter enable` signal.

LED driver uptating, representing the pseudo-code inside the `for driver in 0..8` for-loop
```

```