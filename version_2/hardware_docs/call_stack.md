# Call stack

256-level stack for program return addresses, 16-bit word size.

At "rest" the post-adder latch (connected to memory address) is pointing to the element at the ToS. This means a pop can be OE'd to the bus immediately but a push has to wait for the pointer to be incremented.

Plot sources to be pasted into <a href="wavedrom.com/editor.html">Wavedrom</a>.

### Push

```
{
  signal: [
    {name: "CLK", wave: "lhlhlh"},
	{},
	{name: "Call stack - Push (ctrl unit)", wave: "lh.l.."},
	{name: "Post-adder latch OE (ctrl unit)", wave: "l.h..l"},
    {},
    {name: "Pre-adder latch CLK", wave: "lh.l.."},
    {name: "Post-adder latch CLK", wave: "l.h.l."},
    {name: "Memory write", wave: "l..hl."},
    {name: "Pointer ++(0) / -- (1)", wave: "l....."}
  ]
}
```

### Pop

```
{
  signal: [
    {name: "CLK", wave: "lhlhlh"},
	{},
	{name: "Call stack - Pop & OE (ctrl unit)", wave: "lh.l.."},
    {},
    {name: "Pre-adder latch CLK", wave: "l.h.l."},
    {name: "Post-adder latch CLK", wave: "l..h.l"},
    {name: "Memory read", wave: "lh.l.."},
    {name: "Pointer ++(0) / -- (1)", wave: "l.h.l."}
  ]
}
```