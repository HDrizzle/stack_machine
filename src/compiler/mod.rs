//! Functionality to turn assembly into binary
//! Assembly pipeline:
//! * Create syntax tree
//! * Remove comments
//! * Create program skeleton from syntax tree, a lot of validation will happen here
//! * Perform macro expansion on program skeleton
//! * Program skeleton will now consist entierly of assembly words, compile to machine code, done
use std::fs;

use crate::prelude::*;

pub mod macros;
pub mod syntax_tree;
pub mod program_skeleton;
pub mod assembly_encode;

use syntax_tree::{SyntaxTreeNode, ParseError, ParseErrorType};
use program_skeleton::program_skeleton_build;
use assembly_encode::{AssemblyEncodeErrorEnum, Token, TokenEnum};

#[derive(Debug)]
pub enum CompilerErrorEnum {
	Assembly(AssemblyEncodeErrorEnum),
	Parse(syntax_tree::ParseError),
	ProgramSkeleton(program_skeleton::ProgramSkeletonBuildError)
}

/// Assembler error
#[derive(Debug)]
pub struct CompilerError {
	/// Option for line number (which will start at 1 :( ) and line raw text
	pub location_opt: Option<(usize, String)>,
	/// Specific message
	pub message_opt: Option<String>,
	/// Specific error
	pub enum_: CompilerErrorEnum
}

impl CompilerError {
	pub fn new(
		location_opt: Option<(usize, String)>,
		message_opt: Option<String>,
		enum_: CompilerErrorEnum
	) -> Self {
		Self {
			location_opt,
			message_opt,
			enum_
		}
	}
	pub fn format(&self) -> String {
		match &self.location_opt {
			Some((line_n, line)) => format!(
				"Error on line {}: {:?}\n\t{}{}\n",
				line_n,
				self.enum_,
				line,
				match &self.message_opt {
					Some(msg) => format!("\n\n\t{}", msg.clone()),
					None => "".to_owned()
				}
			),
			None => format!(
				"Error: {:?}\n\t{}\n",
				self.enum_,
				match &self.message_opt {
					Some(msg) => format!("\n\n\t{}", msg.clone()),
					None => "".to_owned()
				}
			)
		}
	}
	pub fn from_source_string_index(_source: &Vec<char>, _i: usize, message_opt: Option<String>, enum_: CompilerErrorEnum) -> Self {
		/*let (_, begin_i) = parse_until_false(source, i, |c: &char| -> bool {*c != '\n'}, None, false).expect("This fucntion should not error with the provided arguments");
		let (_, end_i) = parse_until_false(source, i, |c: &char| -> bool {*c != '\n'}, None, true).expect("This fucntion should not error with the provided arguments");
		let line_n: usize = source[0..begin_i].iter().filter(|c: &&char| -> bool {**c == '\n'}).count() + 2;
		let line: String = source[begin_i..end_i].iter().collect();*/
		// Done
		Self {
			location_opt: None,//Some((line_n, line)),
			message_opt,
			enum_
		}
	}
}

/// Main compile function
pub fn compiler_pipeline(in_: &str, config: &AssemblerConfig) -> Result<Vec<u16>, Vec<CompilerError>> {
	// First, make vector of chars
	let source: Vec<char> = in_.chars().collect();
	// Parse into syntax tree
	let syntax_tree: SyntaxTreeNode = match SyntaxTreeNode::build_tree(&source) {
		Ok(tree) => tree,
		Err(parse_error) => {return Err(vec![CompilerError::from_source_string_index(&source, parse_error.begin, None, CompilerErrorEnum::Parse(parse_error))]);}
	};
	// Compile program instructions
	let token_lines: Vec<Vec<Token>> = match program_skeleton_build(&syntax_tree) {
		Ok(skelet) => skelet,
		Err(skelet_error) => {return Err(vec![CompilerError::new(None, None, CompilerErrorEnum::ProgramSkeleton(skelet_error))]);}
	};
	// Assemble, a lot of this is copied from `compiler_pipeline_old()`
	let mut errors = Vec::<CompilerError>::new();
	// Split into lines
	let raw_lines: Vec<&str> = in_.split("\n").collect();
	// Convienience closure function
	let mut add_error = |line_index: usize, message_opt: Option<String>, error_enum: CompilerErrorEnum| {
		errors.push(CompilerError::new(Some((line_index+1, raw_lines[line_index].to_owned())), message_opt, error_enum));
	};
	let mut out = Vec::<u16>::new();
	for (i, line) in token_lines.iter().enumerate() {
		match assembly_encode::assemble_instruction(line, config) {
			Ok(instruction) => {out.push(instruction);},
			Err((err_enum, msg)) => add_error(i, msg, CompilerErrorEnum::Assembly(err_enum))
		}
	}
	// Done
	if errors.len() == 0 {
		Ok(out)
	}
	else {
		Err(errors)
	}
}

/// Turn raw string (probably from assembly source file) into machine code
/*#[deprecated]
pub fn compiler_pipeline_old(in_: &str, config: &AssemblerConfig) -> Result<Vec<u16>, Vec<CompilerError>> {
	let mut out = Vec::<u16>::new();
	let mut errors = Vec::<CompilerError>::new();
	// Split into lines
	let raw_lines: Vec<&str> = in_.split("\n").collect();
	// Convienience closure function
	let mut add_error = |line_index: usize, message_opt: Option<String>, error_enum: CompilerErrorEnum| {
		errors.push(CompilerError::new(Some((line_index+1, raw_lines[line_index].to_owned())), message_opt, error_enum));
	};
	// Tokenize
	let token_lines: Vec<Vec<Token>> = tokenize(in_, config)?;
	// Assemble
	for (i, line) in token_lines.iter().enumerate() {
		match assembly_encode::assemble_instruction(line, config) {
			Ok(instruction) => {out.push(instruction);},
			Err((err_enum, msg)) => add_error(i, msg, CompilerErrorEnum::Assembly(err_enum))
		}
	}
	// Done
	if errors.len() == 0 {
		Ok(out)
	}
	else {
		Err(errors)
	}
}*/

pub fn compiler_pipeline_formated_errors(in_: &str, config: &AssemblerConfig) -> Result<Vec<u16>, String> {
	match compiler_pipeline(in_, config) {
		Ok(program) => Ok(program),
		Err(errors) => {
			let mut out = String::new();
			for error in &errors {
				out += &error.format();
			}
			out += &format!("\nCould not complete assembly due to {} error(s)", errors.len());
			// Done
			Err(out)
		}
	}
}

/*#[deprecated]
fn tokenize(in_: &str, _config: &AssemblerConfig) -> Result<Vec<Vec<Token>>, Vec<CompilerError>> {
	// TODO: ignore comments
	let mut errors = Vec::<CompilerError>::new();
	let mut token_lines = Vec::<Vec<Token>>::new();
	for (i, line) in in_.split("\n").enumerate() {
		let mut tokens = Vec::<Token>::new();
		for token_raw in line.split(" ") {
			match Token::decode(token_raw) {
				Ok(token) => tokens.push(token),
				Err(err_enum) => errors.push(CompilerError::new(Some((i+1, line.to_owned())), None, CompilerErrorEnum::Assembly(err_enum)))
			}
		}
		token_lines.push(tokens);
	}
	// Done
	if errors.len() == 0 {
		Ok(token_lines)
	}
	else {
		Err(errors)
	}
}*/

/// Attempts to run assembler on given file in `assembly_sources`
pub fn assemble_file(name: &str, assembler_config: &AssemblerConfig) -> Result<(), String> {
	let path: String = resources::ASSEMBLY_SOURCES_DIR.to_owned() + name;
	let file_raw = to_string_err(fs::read_to_string(&path))?;
	match compiler_pipeline_formated_errors(&file_raw, assembler_config) {
		Ok(program) => {
			// Format list of numbers in decimal
			let mut num_list = String::new();
			for (i, n) in program.iter().enumerate() {
				num_list += &format!("{}", n);
				if i < program.len() - 1 {
					num_list += ",";
				}
			}
			// Put in file
			to_string_err(fs::write(resources::OUTPUT_DIR.to_owned() + name + ".dec_list", &num_list))?;
		},
		Err(s) => println!("{}", s)
	}
	Ok(())
}