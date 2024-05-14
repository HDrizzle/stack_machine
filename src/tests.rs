//! Tests

use crate::{assembler, prelude::*};

#[test]
fn math() {
	// Assemble program
	let assembly_source = "write 0x01 stack-push
write 0x02 stack-push
move stack-pop alu-a
move stack-pop alu-b
move add alu stack-push
halt";
	let assembler_config = resources::load_assembler_config().expect("Unable to load assembler config");
	let program: Vec<u16> = match assembler::assembler_pipeline_formated_errors(assembly_source, &assembler_config) {
		Ok(program) => program,
		Err(s) => panic!("{}", s)
	};
	// Check that assembled program is correct
	let binary_program_check: Vec<u16> = vec![
		0x1011,// write 1 stack
		0x1021,// write 2 stack (no pun intended)
		0x2000,// move to ALU
		0x3000,// move to ALU
		0x1200,// add
		0x0004// halt
	];
	assert_eq!(program, binary_program_check);
	// Run
	let mut machine = Machine::new(program);
	machine.run(|_| -> u8 {0x00}).unwrap();
	// All that work to add 1 + 2
	//println!("stack: {:?}", &machine.stack_mem[0..5]);
	//println!("ALU A & B: {}, {}", machine.alu.latch_a, machine.alu.latch_b);
	assert_eq!(machine.stack_mem[1], 0x03);// Number at top-of-stack shoud be 1 + 2 = 3
}

#[test]
fn fibonacci() {
	let assembly_source = "WRITE 0x00 GPRAM-ADDR-A
WRITE 0x00 GPRAM-ADDR-B
WRITE 0x00 SET-STACK-OFFSET
WRITE 0x01 STACK-PUSH
WRITE 0x01 STACK-PUSH
MOVE OFFSET-READ GPRAM-INC-ADDR
MOVE OFFSET-READ GPRAM-INC-ADDR
WRITE 0x00 GOTO-B
WRITE 0x15 GOTO-A
MOVE GPRAM-ADDR-A ALU-A
WRITE 0x0A ALU-B
MOVE GREATER-THEN ALU GOTO-DECIDER
GOTO-IF
MOVE STACK-POP ALU-A
MOVE STACK-POP ALU-B
MOVE A ALU STACK-PUSH
MOVE ADD ALU GPRAM-INC-ADDR
MOVE ADD ALU STACK-PUSH
WRITE 0x07 GOTO-A
WRITE 0x00 GOTO-B
GOTO
HALT";
	let assembler_config = resources::load_assembler_config().expect("Unable to load assembler config");
	let program: Vec<u16> = match assembler::assembler_pipeline_formated_errors(assembly_source, &assembler_config) {
		Ok(program) => program,
		Err(s) => panic!("{}", s)
	};
	let binary_program_check: Vec<u16> = vec![
		// Set gpram pointer
		0x9001,
		0xA001,
		// Set stack offset to 0
		0xD001,
		// Starting numbers
		0x1011,// write 1 stack
		0x1011,// write 1 stack
		0x8100,// move to GPRAM
		0x8100,// move to GPRAM
		// While loop decision
		0x5001,// End pointer part B
		0x4151,// end pointer: 21 or 0x15
		0x2600,// MOVE GPRAM-ADDR-A ALU-A
		0x30A1,// WRITE 0x0A ALU-B
		0x62C0,// MOVE (GREATER-THEN) ALU GOTO-DECIDER
		0x0003,// GOTO-IF
		// Math
		0x2000,
		0x3000,
		0x12D0,// MOVE A ALU STACK-PUSH
		0x8200,
		0x1200,
		// Goto beginning of loop
		0x4071,// GOTO A, beginning of loop pointer: 7
		0x5001,// GOTO B
		0x0002,// GOTO
		// End
		0x0004
	];
	assert_eq!(program, binary_program_check);
	// Run
	let mut machine = Machine::new(program);
	machine.run(|_| -> u8 {0x00}).unwrap();
	// Check for fibonacci sequence in GPRAM
	assert_eq!(machine.general_mem[0..9], [1, 1, 2, 3, 5, 8, 13, 21, 34]);
}