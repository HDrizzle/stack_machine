# Vector graphics controller

This will be an interface between the computer's bus and a cathode-ray tube (either something I make myself or an oscilloscope).
It will have a memory of 2^15 2D vectors each represented by 2 bytes (one for X and one for Y).
There will be another memory space for what I will call Sprites. Each Sprite will contain a starting address (15 bit) into the vector memory, an enable flag (1 bit), a length (8 bit) also for the vector memory, and an XY offset (16 bit) for a total of 40 bits. The sprite memory will be indexed by two numbers: sprite address (8 bit) and sprite field (3 bit).

## 4 Inputs from bus, 1 byte each

* Vector address A (bits 0-7) / Sprite address
* Vector address B (bits 8-15) / Sprite set field
* Vector write X / Sprite write to field
* Vector write Y / Nothing

Since the vector memory is 2^15, the MSB is used to determine if writing to vector or sprite memory: 0=Vector, 1=Sprite.

## High level organization

1. Circuitry that reads values from the bus and stores them in the write buffer waiting to be read into the vector or sprite memory. Clocked by the computer main clock.
2. Digital logic that continuously reads from sprite and vector memory and sets the inputs of the analog signal generator. Clocked seperately from the computer.
3. The analog signal generator takes as its inputs two digital vectors with 8 bit components, total 32 bits. It will linearly interpolate between the start and end point at the correct speed to keep the brightness of short and long segments consistent. Apart from a lookup table for euclidean distance, it will use analog circuitry to generate the X and Y signals. Basic diagram can be found <a href="https://lucid.app/lucidchart/322781f9-6fc4-4d50-8bcb-cb421720b728/edit?viewport_loc=453%2C-215%2C1675%2C932%2C0_0&invitationId=inv_0f441930-83fd-46a3-a112-9ca28e1ba423">on lucidchart</a>.

## Vector reader logic

Pseudocode for timing, anything done by its own clock edge is on its own line
```
Loop Sprite address (8 bit):
	Read byte 1 (Vector address bits 8-14, enable flag)
	If enable flag (byte 1 bit 7) false:
		Continue
	Read byte 0 (Vector address bits 0-7)
	Read byte 2 (Length)
	Read byte 3 (Offset X)
	Read byte 4 (offset Y)
	Loop vector address (15 bit):
		If vector address == sprite start address + prite length:
			break
		Wait for next vector pulse from analog drawer indicating end of current line
		Load new (vector from current vector memory address) + sprite translation into one of the two analog generator vector buffers
```

### Timing

Wavedrom source:
```
{
  signal: [
    {name: "CLK", wave: "lhlhlhlhlhlh"},
    {name: "CLK Enable", wave: "h..........."},
    {name: "Sprite address", wave: "22.2........", data: ["0x00", "0x01", "0x02"]},
    {name: "Sprite address++", wave: "lhlhl.......", node: "...b"},
    {name: "Next sprite", wave: "lh...l......", node: ".c"},
    {name: "Sprite memory read", wave: "l.h...l.....", node: "..a"},
    {name: "Analog vector buffer CLK", wave: "l......h.l.."}
  ],
  edge: ["a~>b Disabled sprite", "c~>a"]
}
```