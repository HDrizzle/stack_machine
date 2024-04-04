//! Tests

use crate::prelude::*;

#[test]
fn math() {
    let program: Vec<u16> = vec![
        0x0111,// push 1
        0x0121,// push 2
        0x2100,// move to ALU
        0x3100,// move to ALU
        0x1200,// add
        0x0005// halt
    ];
    let mut machine = Machine::new(program);
    machine.run(|_| -> u8 {0x00}).unwrap();
    assert_eq!(machine.stack_mem[0], 0x03);
}