# All Timing diagrams go here

## Memory read delays

For flash whichever is highest of:
* TCE (chip enable) = 70 ns
* TOE (output enable) = 35 ns
* TOH (hold from address change), maximum unspecified

For RAM whichever is highest of:
* TACE (chip enable) = 55 ns
* TOE (output enable) = 30 ns
* TAA (hold from address change) = 55 ns

## RAM Write delay

* TDW (data valid before write) = 25 ns
* TAW - TDW (address set before write) = 50 ns - 25 ns = 25 ns

Conclusion: These times are comparable to other logic devices so no extra clock cycles needed.

Paste into https://wavedrom.com/editor.html

