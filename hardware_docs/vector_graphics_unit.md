# Vector graphics controller

This will be an interface between the computer's bus and a cathode-ray tube (either something I make myself or an oscilloscope).
It will have a memory of 2^15 2D vectors each represented by 2 bytes (one for X and one for Y).
There will be another memory space for what I will call Sprites. Each Sprite will contain a starting address (15 bit) into the vector memory, an enable flag (1 bit), a length (8 bit) also for the vector memory, and an XY offset (16 bit) for a total of 40 bits. The sprite memory will be indexed by two numbers: sprite address (8 bit) and sprite field (3 bit).
The reason that the vector hardware is so complicated is to compensate for the slowness of the computer. All the computer needs to do is update sprites and vectors whenever things move and the hardware will be responsible for continuously writing to the display.

## 4 Inputs from bus, 1 byte each

* Vector address A (bits 0-7) / Sprite address
* Vector address B (bits 8-14) (MSB=0) / Sprite set field address (MSB=1)
* Vector write X / Sprite write to field
* Vector write Y / Configure sprite offset resolution: 0 = normal, 1 = *3

Since the vector memory is 2^15, the MSB is used to determine if writing to vector or sprite memory: 0=Vector, 1=Sprite.

## Simulation test data

Single square

Vector memory X: `128,128,200,200,128`
Vector memory Y: `128,200,200,128,128`
Sprite memory: `128,0,5,48,48,0,0,0,0,0,0,0,0,0,0,0`

Two squares

Vector memory X: `128,128,200,200,128`
Vector memory Y: `128,200,200,128,128`
Sprite memory: `128,0,5,48,48,0,0,0,128,0,5,128,128,0,0,0`

## Number representation

Sprite source vectors will have 8-bit unsigned components. Vector=128 + offset=128 will always be in the center regardless of offset resolution.

Output coords (10 bit) from 0 to 896:
	View is from 384 to 640, 512 is in the middle of the screen.

If offset resolution == normal:
	Output = vector + offset + 256
Else, offset resolution == *3:
	Output = vector + (offset * 3)

The logic for this will look like:
	Output = vector + offset + match resolution {
		0 => 256,
		1 => offset << 1
	}

## High level organization

1. Circuitry that reads values from the computer's bus and stores them in the write buffer waiting to be read into the vector or sprite memory. Clocked by the computer's clock. It will have to make sure to only write to the memory when it is also not being read.
2. Digital logic that continuously reads from sprite and vector memory and sets the inputs of the analog signal generator. Clocked seperately from the computer.
3. The analog signal generator takes as its inputs two digital vectors with 9 bit components, total 36 bits. It will linearly interpolate between the start and end point at the correct speed to keep the brightness of short and long segments consistent. Apart from a lookup table for euclidean distance, it will use analog circuitry to generate the X and Y signals. Whenever it is done drawing a line segment it will send a short pulse back to the memory reader so it can update the vectors. This is the part I want help with. Basic diagram can be found <a href="https://lucid.app/lucidchart/322781f9-6fc4-4d50-8bcb-cb421720b728/edit?viewport_loc=453%2C-215%2C1675%2C932%2C0_0&invitationId=inv_0f441930-83fd-46a3-a112-9ca28e1ba423">on lucidchart</a>.

## Vector reader logic

Sprite fields:

0. Vector address bits 8-14, enable flag
1. Vector address bits 0-7
2. Length
3. Offset X
4. Offset Y

Pseudocode for timing
```
Loop Sprite address (8 bit):
	Reset sprite field counter
	Read byte 0 (Vector address bits 8-14, enable flag)
	If enable flag (byte 1 bit 7) false:
		Continue
	Increment sprite field counter
	Read byte 1 (Vector address bits 0-7)
	Increment sprite field counter
	Read byte 2 (Length)
	Increment sprite field counter
	Read byte 3 (Offset X)
	Increment sprite field counter
	Read byte 4 (offset Y)
	// Vector loop, uninterrupted it takes 2 clock cycles
	Loop (start signal read on CLK FALLING):
		// If beginning a new sprite, both the vectors need to be loaded right after each other to prevent a line being drawn between them
		If vector address != sprite start address:
			Stop clock
			Wait for next vector pulse from analog drawer indicating end of current line
			// Another whole clock cycle is consumed after the wait so that this branch can trigger the rest of the loop
		Load new (vector from current vector memory address) + sprite translation into one of the two analog generator vector buffers
		Increment vector address (15 bit)
		If vector address == sprite start address + sprite length:
			break
```

### Vector reader timing

Paste into wavedrom.com/editor.html
OLD
```
{
	signal: [
		{name: "CLK", wave: "lhlhlhlhlhlhlhlhlh..lhlh"},
		{name: "CLK Enable (AND)", wave: "h................l..h...", node: ".................e"},
		{name: "Sprite address", wave: "22.2...................2", data: ["0x00", "0x01", "0x02", "0x03"]},
		{name: "Start", wave: "h.l....................."},
		{name: "Sprite address++ / Sprite field reset", wave: "lhlhl..................h", node: "...b"},
		{name: "Next sprite", wave: "lh...l.................h", node: ".c.....................j"},
		{name: "Sprite field", wave: "22....2.2.2.2..........2", data: ["0x4", "0x0", "0x1", "0x2", "0x3", "0x4", "0x0"]},
		{name: "Sprite field++", wave: "l.....hlhlhlhl.........."},
		{name: "Sprite field CLK", wave: "l....hlhlhlhlhl........."},
		{name: "Inner loop start cycle", wave: "l............h.l.h...l..", node: "..............i..d"},
		{name: "Vector address", wave: "2......2........2.....2.", data: ["?", "Start + 0", "Start + 1", "Start + 2"]},
		{name: "Vector address++ (Pre-A)", wave: "hl.............h.l...h.l"},
		{name: "Vector address++ (Post-A)", wave: "h.l.............h...l.h.", node: ".......................k"},
		{name: "Analog -> line done level trigger", wave: "l...................l..."},
		{name: "Vector CLK -> Analog", wave: "hl.............h.l...h.l"},
		{name: "Vector memory write safe (1) / read (0)", wave: "h..........l....h...l.h."},
		{name: "Sprite memory write safe (1) / read (0)", wave: "hl.............h.......l"}
	],
	edge: ["c~>b Disabled sprite", "d~>e", "i~>h", "d~>g", "k~>j", "a Not needed"]
}
```

New version with different clock stop times
NEW
```
{
	signal: [
		{name: "CLK", wave: "lhlhlhlhlhlhlhlhlhlhlh..lhlh"},
		{name: "CLK Enable (AND)", wave: "h....................l..h..l", node: ".....................e"},
		{name: "Sprite address", wave: "22.2.......................2", data: ["0x00", "0x01", "0x02", "0x03"]},
		{name: "Start", wave: "h.l........................."},
		{name: "Sprite address++ / Sprite field reset", wave: "lhlhl......................h", node: "...b"},
		{name: "Next sprite", wave: "lh...l.....................h", node: ".c.........................j"},
		{name: "Sprite field", wave: "22....2.2.2.2..............2", data: ["0x4", "0x0", "0x1", "0x2", "0x3", "0x4", "0x0"]},
		{name: "Sprite field++", wave: "l.....hlhlhlhl.............."},
		{name: "Sprite field CLK", wave: "l....hlhlhlhlhl............."},
		{name: "Inner loop start cycle", wave: "l............h.l.h.l.h...l..", node: "..............i......d"},
		{name: "Vector address", wave: "2......2........2...2...2...", data: ["?", "Start + 0", "Start + 1", "Start + 2", "Start + 3"]},
		{name: "Vector address++ (Pre-A)", wave: "hl.............h.l.h.l...h.l"},
		{name: "Vector address++ (Post-A)", wave: "h.l.............h.l.h...l.h.", node: "...........................k"},
		{name: "Analog -> line done level trigger", wave: "l.......................l..."},
		{name: "Vector CLK -> Analog", wave: "hl.............h.l.h.l...h.l"},
		{name: "Vector memory write safe (1) / read (0)", wave: "h.............l.h.l.h...l.h."},
		{name: "Sprite memory write safe / Beam enable (1) / read (0)", wave: "hl.............h...........l"}
	],
	edge: ["c~>b Disabled sprite", "d~>e", "i~>h", "d~>g", "k~>j", "a Not needed"]
}
```

## Bus reader logic

Pseudocode for timing
```

```