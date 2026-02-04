# IO Controller

The GPIO pins will consust of:
* 2 8-bit inputs (`GPIO-READ-A` and `GPIO-READ-B`)
* For each input: Signals for external components to have the computer wait to read inputs. Pulldown resistors will disable these by default.
* 2 8-bit outputs (`GPIO-WRITE-A` and `GPIO-WRITE-B`)
* 2 Corresponding signals which are set high for 1 cycle after either of the outputs are updated.

## Timing

Plot sources to be pasted into <a href="wavedrom.com/editor.html">Wavedrom</a>.

GPIO Output
```

```