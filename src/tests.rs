//! Tests

use crate::{compiler::{self, assembly_encode::{Token, TokenEnum}, macros::{Macro, MacroEnum, MacroArgument}, syntax_tree::{SyntaxTreeNode, SyntaxTreeNodeType}}, prelude::*};

#[test]
fn parse_binary_literal() {
	// Simple
	let source: Vec<char> = String::from("0x42").chars().collect();
	assert_eq!(check_for_and_parse_bit_string(&source, 0, None).expect("Did not find literal").expect("Shouldn\'t return error"), (vec![0x42], 8, 4));
	// Offset start
	let source: Vec<char> = String::from("  0x42 ").chars().collect();
	assert_eq!(check_for_and_parse_bit_string(&source, 2, None).expect("Did not find literal").expect("Shouldn\'t return error"), (vec![0x42], 8, 6));
	// Invalid
	let source: Vec<char> = String::from("  0 x42 ").chars().collect();
	assert!(check_for_and_parse_bit_string(&source, 2, None).is_none());
}

#[test]
fn parse() {
	let source: Vec<char> = String::from("write 0x42 stack-push;").chars().collect();
	let tree: SyntaxTreeNode = SyntaxTreeNode::build_tree(&source).unwrap();
	assert_eq!(tree.type_, SyntaxTreeNodeType::Program);
	assert_eq!(tree.children[0].type_, SyntaxTreeNodeType::Instruction);
	assert_eq!(tree.children[0].children.len(), 3);// Length of first instruction should be three tokens
	assert_eq!(tree.children[0].children[0].type_, SyntaxTreeNodeType::InstructionToken(Token::new(TokenEnum::AssemblyWord("write".to_owned()), "write".to_owned())));
	assert_eq!(tree.children[0].children[1].type_, SyntaxTreeNodeType::InstructionToken(Token::new(TokenEnum::Literal{n: 0x42, bit_size: 8}, "0x42".to_owned())));
	assert_eq!(tree.children[0].children[2].type_, SyntaxTreeNodeType::InstructionToken(Token::new(TokenEnum::AssemblyWord("stack-push".to_owned()), "stack-push".to_owned())));
}

#[test]
fn parse_with_macros() {
	let source: Vec<char> = String::from("@anchor(start);write 0x42 stack-push;").chars().collect();
	let tree: SyntaxTreeNode = SyntaxTreeNode::build_tree(&source).unwrap();
	assert_eq!(tree.type_, SyntaxTreeNodeType::Program);
	// First instruction
	assert_eq!(tree.children[0].children.len(), 0);// Token has no children
	assert_eq!(tree.children[0].type_, SyntaxTreeNodeType::Macro(Macro{type_: MacroEnum::Anchor, args: vec![MacroArgument::Identifier("start".to_owned())]}));
	// Second instruction
	assert_eq!(tree.children[1].type_, SyntaxTreeNodeType::Instruction);
	assert_eq!(tree.children[1].children.len(), 3);// Length of second instruction should be three tokens
	assert_eq!(tree.children[1].children[0].type_, SyntaxTreeNodeType::InstructionToken(Token::new(TokenEnum::AssemblyWord("write".to_owned()), "write".to_owned())));
	assert_eq!(tree.children[1].children[1].type_, SyntaxTreeNodeType::InstructionToken(Token::new(TokenEnum::Literal{n: 0x42, bit_size: 8}, "0x42".to_owned())));
	assert_eq!(tree.children[1].children[2].type_, SyntaxTreeNodeType::InstructionToken(Token::new(TokenEnum::AssemblyWord("stack-push".to_owned()), "stack-push".to_owned())));
}

#[test]
fn test_parse_string_literal() {
	let string_to_parse = "\"Hello World\\n\"".to_owned();
	let source: Vec<char> = string_to_parse.chars().collect();
	assert_eq!(
		parse_string_literal(&source, 1).unwrap(),
		("Hello World\n".to_owned(), string_to_parse.len())
	);
}

#[test]
fn parse_macro_with_string_literal() {
	let source: Vec<char> = String::from("@write_string(\"Hello world\\n\");").chars().collect();// "Hello world\n"
	let tree: SyntaxTreeNode = SyntaxTreeNode::build_tree(&source).unwrap();
	assert_eq!(tree.type_, SyntaxTreeNodeType::Program);
	// First instruction
	assert_eq!(tree.children[0].children.len(), 0);// Macro has no children
	assert_eq!(tree.children[0].type_, SyntaxTreeNodeType::Macro(Macro{type_: MacroEnum::WriteString, args: vec![MacroArgument::StringLiteral("Hello world\n".to_owned())]}));
}

#[test]
fn macro_expansion() {
	let assembly_source_test = "@anchor(start);write 0x42 stack-push;@goto(start);@goto_if(start);@call(start);";// This program doesn't make sense, it's just for testing macros
	let assembly_source_control = "
		write 0x42 stack-push;
		write 0xFF goto-a;write 0xFF goto-b;goto;
		write 0xFF goto-a;write 0xFF goto-b;goto-if;
		write 0xFF goto-a;write 0xFF goto-b;call;
	";
	// Load assembler config
	let assembler_config = resources::load_assembler_config().expect("Unable to load assembler config");
	// Compile both programs
	let program_test: Vec<u16> = match compiler::compiler_pipeline_formated_errors(assembly_source_test, &assembler_config) {
		Ok(program) => program,
		Err(s) => panic!("{}", s)
	};
	let program_control: Vec<u16> = match compiler::compiler_pipeline_formated_errors(assembly_source_control, &assembler_config) {
		Ok(program) => program,
		Err(s) => panic!("{}", s)
	};
	// They should produce the exact same machine code
	assert_eq!(program_test, program_control);
}

#[test]
fn math() {
	// Assemble program
	let assembly_source = "write 0x01 stack-push;
write 0x02 stack-push;
move stack-pop alu-a;
move stack-pop alu-b;
move add alu stack-push;
halt;";
	let assembler_config = resources::load_assembler_config().expect("Unable to load assembler config");
	let program: Vec<u16> = match compiler::compiler_pipeline_formated_errors(assembly_source, &assembler_config) {
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
	machine.run(&mut GpioInterfaceDoesNothing).unwrap();
	// All that work to add 1 + 2
	//println!("stack: {:?}", &machine.stack_mem[0..5]);
	//println!("ALU A & B: {}, {}", machine.alu.latch_a, machine.alu.latch_b);
	assert_eq!(machine.stack_mem[1], 0x03);// Number at top-of-stack shoud be 1 + 2 = 3
}

#[test]
fn fibonacci() {
	let assembly_source = "WRITE 0x00 GPRAM-ADDR-A;
WRITE 0x00 GPRAM-ADDR-B;
WRITE 0x00 SET-STACK-OFFSET;
WRITE 0x01 STACK-PUSH;
WRITE 0x01 STACK-PUSH;
MOVE OFFSET-READ GPRAM-INC-ADDR;
MOVE OFFSET-READ GPRAM-INC-ADDR;
WRITE 0x00 GOTO-B;
WRITE 0x14 GOTO-A;
MOVE GPRAM-ADDR-A ALU-A;
WRITE 0x0B ALU-B;
MOVE EQ ALU GOTO-DECIDER;
GOTO-IF;
MOVE STACK-POP ALU-A;
MOVE STACK-POP ALU-B;
MOVE A ALU STACK-PUSH;
MOVE ADD ALU GPRAM-INC-ADDR;
MOVE ADD ALU STACK-PUSH;
WRITE 0x06 GOTO-A;
WRITE 0x00 GOTO-B;
GOTO;
HALT;";
	let assembler_config = resources::load_assembler_config().expect("Unable to load assembler config");
	let program: Vec<u16> = match compiler::compiler_pipeline_formated_errors(assembly_source, &assembler_config) {
		Ok(program) => program,
		Err(s) => panic!("{}", s)
	};
	let binary_program_check: Vec<u16> = vec![
		// Set gpram pointer
		0x9001,
		0xA001,
		// Set stack offset to 0
		0xDFF1,
		// Starting numbers
		0x1011,// write 1 stack
		0x1011,// write 1 stack
		0x8100,// move to GPRAM
		0x8100,// move to GPRAM
		// While loop decision
		0x5001,// End pointer part B
		0x4141,// end pointer: 21 or 0x15
		0x2600,// MOVE GPRAM-ADDR-A ALU-A
		0x30B1,// WRITE 0x0B ALU-B
		0x6270,// MOVE EQ ALU GOTO-DECIDER
		0x0003,// GOTO-IF
		// Math
		0x2000,
		0x3000,
		0x1280,// MOVE A ALU STACK-PUSH
		0x8200,
		0x1200,
		// Goto beginning of loop
		0x4061,// GOTO A, beginning of loop pointer: 7
		0x5001,// GOTO B
		0x0002,// GOTO
		// End
		0x0004
	];
	assert_eq!(program, binary_program_check);
	// Run
	let mut machine = Machine::new(program);
	machine.run(&mut GpioInterfaceDoesNothing).unwrap();
	// Check for fibonacci sequence in GPRAM
	assert_eq!(machine.general_mem[0..10], [1, 1, 2, 3, 5, 8, 13, 21, 34, 55]);
}