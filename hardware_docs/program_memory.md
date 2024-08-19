# Program memory

The program memory board will use 2 <a href="https://ww1.microchip.com/downloads/en/DeviceDoc/20005022C.pdf">128k x 8 bit flash memory chips</a> in parallel to make up 16-bit instruction words.

## Reading

There will be a header connecting the program memory board to the control unit main board with all 16 address and 16 data (instruction) bits.

## Writing

An Arduino board will be used for writing to the program memory.

### Timing

The clock signal from the arduino will have a frequency of 1 MHz. It will be used for clocking each new word into the input shift register and running the chip-erase and byte-program sequences.

Chip write sequences: 

Program write arduino side timing diagram:
```
{
  signal: [
    {name: "Clk", wave: "n..|...|..."},
    {name: "Chip erase", wave: "lhl|...|...", node: ".a"},
    {name: "Byte program", wave: "l..|.hl|.hl", node: ".....b...c"},
    {},
    {name: "Data", wave: "x2222222222", data: ["0", "1", "...", "7", "0", "1", "...", "7", "0", "1"]}
  ],
  edge: []
}
```

Internal timing diagram (Chip erase):
```
{
  signal: [
    {name: "Clk", wave: "hlhlhlhlhlhlhlhl"},
    {name: "Chip erase", wave: "lh.l............"},
    {name: "Byte program", wave: "l..............."},
    {},
    {name: "Shift registers", wave: "9.9.9.9.9.9.9.9."},
    {name: "Shift registers latch OE", wave: "l..............."},
    {name: "Data program OE", wave: "l..h...........l"},
    {name: "Data", wave: "x..2.2.2.2.2.2.x", data: ["0xAA", "0x55", "0x80", "0xAA", "0x55", "0x10"]},
    {name: "Address counter CLR", wave: "lh.l............"},
    {name: "Address counter OE", wave: "l..............."},
    {name: "Address program OE", wave: "l.h...........l."},
    {name: "Address", wave: "x.2.2.2.2.2.2.x.", data: ["0x5555", "0x2AAA", "0x5555", "0x5555", "0x2AAA", "0x5555"]},
    {name: "WE#", wave: "h..lhlhlhlhlhlh."},
  ],
  edge: []
}
```

Internal timing diagram (Byte program):
```
{
  signal: [
    {name: "Clk", wave: "hlhlhlhlhlhlhlhlhlhl"},
    {name: "Chip erase", wave: "l..................."},
    {name: "Byte program", wave: "l........h.l........"},
    {name: "D 8-15 & 0-7", wave: "x2.2.2.2.2.2.2.2.x.x", data: ["15&7", "14&6", "13&5", "12&4", "11&3", "10&2", "9&1", "8&0"]},
    {},
    {name: "Shift registers", wave: "9.9.9.9.9.9.9.9.2.9.", data: ["", "", "", "", "", "", "", "", "<data>"]},
    {name: "Shift registers latch CLK", wave: "l................h.l"},
    {name: "Shift registers latch OE", wave: "l................h.l"},
    {name: "Data program OE", wave: "l..........h.....l.."},
    {name: "Data", wave: "x..........2.2.2.2.x", data: ["0xAA", "0x55", "0xA0", "<data>"]},
    {name: "Address counter CLR", wave: "l..................."},
    {name: "Address counter OE", wave: "l...............h.l."},
    {name: "Address program OE", wave: "l.........h.....l..."},
    {name: "Address", wave: "x.........2.2.2.2.x.", data: ["0x5555", "0x2AAA", "0x5555", "<addr>"]},
    {name: "WE#", wave: "h..........lhlhlhlh."},
  ],
  edge: []
}
```