# Assembly language

Each line in an assembly program will correspond with 1 instruction (16 bits). Lines will have the format:

`<opcode (4-bits)> <(4 or 8-bit data (optional))> <4 or 8-bit data (optional)>`

Where `opcode` must be a word in the instruction list in README. `data` may be a hexadecimal representation (like `0x0F`) or binary (like `b00001111`). The first data (4 bits) will be used for addressing ALU operations and other things (described in README), if it is not given then it defalts to `0x0`. ALU operation names can be used only if this is a bus usage instruction taking data from the ALU. The second piece data of (if needed) will consist of names of devices to write to and read from the bus.