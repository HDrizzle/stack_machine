//! Tests

use crate::prelude::*;

#[test]
fn math() {
	let program: Vec<u16> = vec![
		0x1011,// write 1 stack
		0x1021,// write 2 stack (no pun intended)
		0x2100,// move to ALU
		0x3100,// move to ALU
		0x1200,// add
		0x0004// halt
	];
	let mut machine = Machine::new(program);
	machine.run(|_| -> u8 {0x00}).unwrap();
	assert_eq!(machine.stack_mem[1], 0x03);// Number at top-of-stack shoud be 1 + 2 = 3
}

#[test]
fn fibonacci() {
	/* From program_examples.md
	// Set sram pointer
	WRITE 0x00 SRAM-ADDR-A
	WRITE 0x00 SRAM-ADDR-B

	// Starting numbers
	WRITE 0x01 STACK
	WRITE 0x01 STACK
	MOVE STACK-NO-POP SRAM-INC-ADDR
	MOVE STACK-NO-POP SRAM-INC-ADDR

	// While loop decision
	// Prepare GOTO latches with end address
	WRITE 0x00 GOTO-B// TODO: upper byte of end addr
	WRITE 0x00 GOTO-A// TODO: lower byte of end addr
	// Compare SRAM pointer and limit 
	MOVE SRAM-ADDR-A ALU-A
	WRITE 0x0A ALU-B
	MOVE (GREATER-THEN) ALU GOTO-DECIDER
	GOTO-IF

	// Math
	MOVE STACK-POP ALU-A
	MOVE STACK-POP ALU-B
	MOVE (A) ALU STACK
	MOVE (ADD) ALU SRAM-INC-ADDR
	MOVE (ADD) ALU STACK

	// Goto beginning of loop
	WRITE 0x00 GOTO-A// TODO: upper byte of start addr
	WRITE 0x00 GOTO-B// TODO: lower byte of start addr
	GOTO

	// End
	HALT
	*/
	let program: Vec<u16> = vec![
		// Set sram pointer
		0x9001,
		0xA001,
		// Starting numbers
		0x1011,// write 1 stack
		0x1011,// write 1 stack
		0x8000,// move to SRAM
		0x8000,// move to SRAM
		// While loop decision
		0x4121,// end pointer: 18 or 0x12
		0x2800,// MOVE SRAM-ADDR-A ALU-A
		0x30A1,// WRITE 0x0A ALU-B
		0x62C0,// MOVE (GREATER-THEN) ALU GOTO-DECIDER
		0x0003,// GOTO-IF
		// Math
		0x2100,
		0x3100,
		0x12D0,// MOVE (A) ALU STACK
		0x8200,
		0x1200,
		// Goto beginning of loop
		0x4061,// beginning of loop pointer: 6
		0x0002,
		// End
		0x0004
	];
	let mut machine = Machine::new(program);
	machine.run(|_| -> u8 {0x00}).unwrap();
	// Check for fibonacci sequence in SRAM
	assert_eq!(machine.general_mem[0..9], [1, 1, 2, 3, 5, 8, 13, 21, 34]);
}