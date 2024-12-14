# Language

The assembly language closely reflects the actual instructions that it will be converted into. Instructions consist of tokens which can be assembly words (defined in `assembler_config/config.json`) and literal values such as `0x42` or `0b0101`. Instructions and macros are seperated by simicolons (`;`) and all whitespace is ignored except for spaces between instruction tokens. Anything after `#` on a line is treated as a comment.

## Macros

Macros are a way to simplify common parts of the program and to make calling functions easier. A macro consists of a name starting with `@` which is made out of identifier characters followed by parenthesis (`()`) with comma-seperated arguments inside them.

### Anchors

Anchors mark a place in a program that may be `call`ed to `goto`ed to, for example:

```
@anchor(function_name)
```

marks the beginning of a function. An anchor can also mean other things such as the beginning of a loop or the end of an if-statement. To go to an achor, use:

```
@call(function_name)
```

which will be expanded to three instructions: `write 0xXX goto-a`, `write 0xXX goto-b`, `call` where it will write the correct address to the GOTO A & B latches. `@goto(_)` and `goto_if(_)` work in the exact same way.

### Write string

Another macro is `@write_string("Hello world")` which will write each character of the given string (in ASCII) to the GPRAM starting at wherever the address is currently set to.

### Get anchor address

Sometimes it is necessary to access the address of an achor without using any flow control macros. This is why there is the `@push_anchor_address(anchor_name)` macro. It will push two bytes onto the stack, starting with address bits 0 - 7 then 8 - 15.