# Assembly language

Each line in an assembly program will correspond with 1 instruction (16 bits). Lines will be split by spaces into tokens which can either be assembly words or literal hex values starting with `0x`. The order of tokens will always correspond with the order that their corresponding bits will be concatenated to form the instruction, this means that the opcode (bits 0 - 3) will always come first.

For example:

`WRITE 0x42 STACK-PUSH`

will push the byte `0x42` onto the stack.

## Comments

Anything after `//` on a line will be ignored. Block comments have not been implemented yet.