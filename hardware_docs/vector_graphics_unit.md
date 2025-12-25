# Vector graphics controller

This will be an interface between the computer's bus and a cathode-ray tube (either something I make myself or an oscilloscope).
It will have a memory of 2^15 2D vectors each represented by 2 bytes (one for X and one for Y).
There will be another memory space for what I will call Sprites. Each Sprite will contain a starting address (15 bit) into the vector memory, an enable flag (1 bit), a length (7 bit) also for the vector memory, a point/line select (1 bit), and an XY offset (16 bit) for a total of 40 bits. The sprite memory will be indexed by two numbers: sprite address (8 bit) and sprite field (3 bit).
The reason that the vector hardware is so complicated is to compensate for the slowness of the computer. All the computer needs to do is update sprites and vectors whenever things move and the hardware will be responsible for continuously writing to the display.

## 4 Inputs from bus, 1 byte each

* Vector address A (bits 0-7) / Sprite address
* Vector address B (bits 8-14) (MSB=0) / Sprite set field address (bits 0 - 2), Sprite frame (bits 3 - 6) (MSB=1)
* Vector write X / Sprite write to field
* Vector write Y / Sprite offset resolution (LSB) 0 = normal, 1 = *3. Bits 1-7 are the sprite address limit where the LSB is set to 1

Since the vector memory is 2^15, the MSB is used to determine if writing to vector or sprite memory: 0=Vector, 1=Sprite.

### Sprite address limit

When the main loop is going through deactivated sprites, it can leave the sprite memory write enable low for a long time, which can cause sprite updates from the computer to be missed. To prevent this the computer can set the highest prite address reached before looping back to 0. Writing to the 3rd bus input will use the LSB as the resolution config (something else) and the rest of the bits will be used to make an 8-bit number (LSB se tto 1). Setting these bits to all 1s will allow the whole sprite address range. This can also be used to quickly disable sprites higher in memory.

### Sprite frames

Because there are 256 sprites and 8 bytes allocated per sprite, that only uses 11 bits of the memory address. The chips I'm using have 15 bit addresses so I will have 4 bits of the address (11 - 14 although it doesn't actually matter) divide the entire memory into 16 "sprite frames" A sprite frame is a "version" of the sprite memory that can be switched over very fast by the computer simply by updating the corresponding bits in the 2nd bus register. The most recent sprite frame that was set is the one currently displayed.

## Simulation test data

Single square

Vector memory X: `128,128,200,200,128`
Vector memory Y: `128,200,200,128,128`
Sprite memory: `128,0,133,48,48,0,0,0,0,0,0,0,0,0,0,0`

4 squares

Vector memory X: `128,128,200,200,128`
Vector memory Y: `128,200,200,128,128`
Sprite memory: `128,0,133,48,48,0,0,0,128,0,133,128,128,0,0,0,128,0,133,128,48,0,0,0,128,0,133,48,128,0,0,0`

4 squares, offset resolution test
Vectors are from 96 to 160, which is 128 +/- 32

Vector memory X: `96,96,160,160,96`
Vector memory Y: `96,160,160,96,96`
Sprite memory (+/- 16): `128,0,133,116,116,0,0,0,128,0,133,144,144,0,0,0,128,0,133,144,116,0,0,0,128,0,133,116,144,0,0,0` <- Don't use
Sprite memory (+/- 32): `128,0,133,96,96,0,0,0,128,0,133,160,160,0,0,0,128,0,133,160,96,0,0,0,128,0,133,96,160,0,0,0`

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
2. Length bits 0-6 (7 bits), line flag MSB (0=point, 1=line)
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
```
{
	signal: [
		{name: "CLK", wave: "lhlhlhlhlhlhlhlhlhlhlhlhlhlhlhlhlhlh..lhlhlhlhlh"},
		{name: "CLK Enable (AND)", wave: "h..................................l..h........l", node: "...................................e"},
		{name: "Sprite address", wave: "2..2.2..........................................", data: ["0x00", "0x01", "0x02"]},
		{name: "Start outer loop", wave: "h.l...........................................h.", node: "..............................................j"},
		{name: "Sprite address++ / Sprite field reset", wave: "l..hlhl.........................................", node: ".....b"},
		{name: "Next sprite", wave: "l..h...l........................................", node: "...c"},
		{name: "Sprite field", wave: "2..2....2.2.2.2.2...............................", data: ["0x5", "0x0", "0x1", "0x2", "0x3", "0x4", "0x5"]},
		{name: "Sprite field++", wave: "l.......hlhlhlhlhl.............................."},
		{name: "Sprite field CLK", wave: "l......hlhlhlhlhl..............................."},
		{name: "Inner loop start cycle", wave: "l..............h.l.......h.l.......h...l........", node: "..............i....................d"},
		{name: "Vector address", wave: "2........2..........2.........2...........2.....", data: ["?", "Start + 0", "Start + 1", "Start + 2", "Start + 3"]},
		{name: "Vector address++ (Pre-A)", wave: "hl.................h.l.......h.l.........h.l...."},
		{name: "Vector address++ (Post-A)", wave: "h.l.................h.l.......h.l.........h.l..."},
		{name: "Analog -> line done", wave: "l.................................l............."},
		{name: "Vector CLK -> Analog", wave: "hl.................h.l.......h.l.........h.l...."},
		{name: "DAC input select", wave: "l..................h..l......h..l........h..l..."},
		{name: "DAC WE", wave: "l...................hl.hl.....hl.hl.......hl.hl."},
		{name: "DAC LDAC", wave: "l.......................h.l.......h...l.......h.", node: "..............................................k"},
		{name: "Vector memory read", wave: "l.................h.l.......h.l.........h.l....."},
		{name: "Vector memory write safe", wave: "h...............l...h.....l...h.......l...h....."},
		{name: "Sprite memory read", wave: "l..h.............l.............................."},
		{name: "Sprite memory write safe", wave: "hl...............h.............................l"},
		{name: "Beam enable", wave: "h.l..............h.............................."},
		{name: "Toggle line end", wave: "l...............h.l.......h.l..................."},
      
	],
	edge: ["c~>b Disabled sprite", "d~>e", "i~>h", "d~>g", "k~>j", "a Not needed"]
}
```

## Determining which end vector to update

Since the analog LERP is a triangle wave, each consecutive line/point should update one of the start/end vectors (the opposite one to where the LERP signal is). The vector to update will be controlled by an SR latch which will be explicitly set by the analog circuit (two very short signals, one for set, one for reset). The CRT circuit's pulses will be sent when the LERP signal crosses the halfway point. It will also be toggled right before both of the first two points of each sprite ("Toggle line end") by the digital timing.

## Analog stuff

Power supply: +/- 15 V, +5V

DACs: 10 bit, Vout, 5V supply, DigiKey: MAX503CNG+-ND

The two vectors from the digital circuit will go into 10-bit ADCs (total of 4 scalars). The voltage outputs from the ADCs will be LERPed by the output from a triangle wave generator (+/- close to 15V). The LERPing will be done by AD633 difference-multiplier ICs (Powered +/- 15V).

The triangle wave will have a fixed frequency. To prevent inconsistent line brightness, the beam power will be controlled by the sum of 2 op-amp differentiator circuits connected to the X and Y ouputs.

Single coordinate LERP equation (4 of these): X0 + (X1 - X0)*LERP
Voltage limits:
* X0 and X1 from DAC: [0 to 5V]
* LERP: 0V to 1V
* Output: 0V to 5V

## DAC Configuration

Single-suply (+5V), using the 4.096V internal reference