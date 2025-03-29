//! Maine library file

use std::{collections::HashMap, env, fs};

pub mod compiler;
pub mod emulator;
pub mod resources;
pub mod program_upload;
pub mod display_emulator;
pub use crate::prelude::*;
#[cfg(test)]
mod tests;

/// Prelude
pub mod prelude {
    use std::fmt::Write;
    pub use crate::compiler::{assembly_encode::{AssemblyWord, AssemblerConfig}, syntax_tree::{ParseError, ParseErrorType, SyntaxTreeNodeType, ParseContext}, macros::Macro};
    pub use crate::resources;
    pub use crate::emulator::{Machine, GpioInterface, GpioInterfaceDoesNothing, CliInterface};
	// CONSTS
	pub const IDENTIFIER_CHARS: [char; 64] = [
		'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
		'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
		'0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
		'_', '-'];
	pub const WHITESPACE_CHARS: [char; 3] = [' ', '\n', '\t'];
	pub const MACRO_BEGIN: char = '@';
	pub const COMMENT_BEGIN: char = '#';
	pub const HEX_CHARS: [char; 16] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
	pub const BIN_CHARS: [char; 2] = ['0', '1'];
	pub const POWER_16: usize = 65536;
	pub const PROG_MAX_INSTRUCTIONS: usize = POWER_16;
	/// To prevent typoes
    pub fn to_string_err<T, E: ToString>(result: Result<T, E>) -> Result<T, String> {
		match result {
			Ok(t) => Ok(t),
			Err(e) => Err(e.to_string())
		}
	}
	pub fn to_string_err_with_message<T, E: ToString>(result: Result<T, E>, message: &str) -> Result<T, String> {
		match result {
			Ok(t) => Ok(t),
			Err(e) => Err(format!("Message: {}, Error: {}", message, e.to_string()))
		}
	}
	pub fn escape_substitution(char_: char) -> Option<char> {
		match char_ {
			'\\' => Some('\\'),
			'\'' => Some('\''),
			'\"' => Some('\"'),
			'n' => Some('\n'),
			't' => Some('\t'),
			_ => None
		}
	}
	/// iterates through `source` beginning at `start` until it finds a character that is not whitespace
	pub fn skip_whitespace(source: &Vec<char>, start: usize, eof_error_parse_context_opt: Option<ParseContext>) -> Result<usize, ParseError> {
		let mut i: usize = start;
		while i < source.len() {
			if !WHITESPACE_CHARS.contains(&source[i]) {
				return Ok(i);
			}
			i += 1;
		}
		match eof_error_parse_context_opt {
			Some(eof_error_parse_context) => Err(ParseError::new(start, i, ParseErrorType::UnfinishedNode(eof_error_parse_context), None)),
			None => Ok(i)
		}
	}
	/// Parses through `source` beginning at `start` until it finds a character that is not in identifier character
	pub fn parse_identifier(source: &Vec<char>, start: usize, eof_error_parse_context_opt: Option<ParseContext>) -> Result<(String, usize), ParseError> {
		parse_until_false(source, start, |c: &char| -> bool {IDENTIFIER_CHARS.contains(c)}, eof_error_parse_context_opt, true)
	}
	/// For `0xXXXX` or `0bXXXX`
	/// If it doesn't find `0x` or `0b` it will return None
	pub fn check_for_and_parse_bit_string(source: &Vec<char>, start: usize, eof_error_parse_context_opt: Option<ParseContext>) -> Option<Result<(Vec<u8>, u8, usize), ParseError>> {
		if source.len() > start + 1 && source[start] == '0' {
			if source[start+1] == 'x' {
				match parse_identifier(source, start+2, eof_error_parse_context_opt) {
					Ok((raw_s, new_i)) => {
						let hex_decode: Vec<u8> = match hex::decode(&raw_s) {
							Ok(data) => data,
							Err(e) => {return Some(Err(ParseError::new(start, new_i, ParseErrorType::HexParseError, Some(e.to_string()))));}
						};
						let n_bits: usize = raw_s.len() * 4;//hex_decode.len() * 4;
						Some(Ok((hex_decode, n_bits as u8, new_i)))
					},
					Err(e) => Some(Err(e))
				}
			}
			else {
				if source[start+1] == 'b' {
					None// TODO
				}
				else {
					None
				}
			}
		}
		else {
			None
		}
	}
	/// Starts at first character of string, NOT at beginning quote mark. Returns string, where it ends (exclusive)
	pub fn parse_string_literal(source: &Vec<char>, start: usize) -> Result<(String, usize), ParseError> {
		let mut i: usize = start;
		let mut out = String::new();
		while i < source.len() {
			let mut char_ = source[i];
			// Check for end of string
			if char_ == '\"' {
				return Ok((out, i+1));
			}
			// Check for escape subsitiution
			if char_ == '\\' {
				// Check that this isn't the last character
				if i == source.len() - 1 {
					return Err(ParseError::new(i, i+1, ParseErrorType::StringEscapeEOF, None));
				}
				// Check for substitution
				match escape_substitution(source[i+1]) {
					Some(substituted_char) => {
						char_ = substituted_char;
					},
					None => {return Err(ParseError::new(i, i+1, ParseErrorType::StringInvalidEscapeSequence(source[i+1]), None));}
				}
				i += 1;// Extra incrementation
			}
			// Add char_ to output
			out.write_char(char_).unwrap();
			// Never forget
			i += 1;
		}
		// Loop ended without the closing quote, bad
		Err(ParseError::new(start, i, ParseErrorType::UnfinishedNode(ParseContext::StringLiteral), None))
	}
	/// Generic parsing function
	pub fn parse_until_false(source: &Vec<char>, start: usize, f: impl Fn(&char) -> bool, eof_error_parse_context_opt: Option<ParseContext>, forwards: bool) -> Result<(String, usize), ParseError> {
		let mut i: usize = start;
		let mut out = String::new();
		while match forwards {
			true => i < source.len(),
			false => i < usize::MAX// If it goes to zero it will loop around
		} {
			if !f(&source[i]) {
				return Ok((out, i));
			}
			out.write_char(source[i]).unwrap();
			match forwards {
				true => {i += 1;},
				false => {i -= 1;}
			}
		}
		match eof_error_parse_context_opt {
			Some(eof_error_parse_context) => Err(ParseError::new(start, i, ParseErrorType::UnfinishedNode(eof_error_parse_context), None)),
			None => Ok((out, i))
		}
	}
	/// Gets 1-indexed (gross) line number
	pub fn line_n_from_index(source: &Vec<char>, i: usize) -> usize {
		source[0..i].iter().filter(|c: &&char| -> bool {**c == '\n'}).count() + 1
	}
}

fn assemble_to_arduino(program: &Vec<u16>, offset_opt: Option<u16>, len_opt: Option<u16>, chip_erase: bool) -> String {
	let mut out = format!("void test() {{\n  uint16_t program[PROG_ARRAY_SIZE];\n");
	let offset: u16 = match offset_opt {
		Some(n) => n,
		None => 0
	};
	let len_: u16 = match len_opt {
		Some(n) => n,
		None => program.len() as u16 - offset
	};
	assert!((offset as u32) + (len_ as u32) <= 0xFFFF);
	for i in 0..len_ {
		out += format!("  program[{}] = {:#b};\n", i, program[(i + offset) as usize]).as_str();
	}
	out += &format!("  upload_program(program, {}, {}, {});\n}}\n", offset, len_, match chip_erase {true => "true", false => "false"});
	// Done
	out
}

fn parse_args(args: &Vec<String>) -> HashMap<String, String> {
	let mut out = HashMap::<String, String>::new();
	for arg in args {
		if arg.len() >= 2 {
			let arg_vec: Vec<char> = arg.chars().collect();
			if arg_vec[0] == '-' {
				// Parse until "="
				let mut key = String::new();
				let mut i = 1;// Exclude '='
				while i < arg_vec.len() {
					if arg_vec[i] == '=' {
						break;
					}
					key.push(arg_vec[i]);
					i += 1;
				}
				i += 1;// Now 1 past '='
				let mut value = String::new();
				while i < arg_vec.len() {
					value.push(arg_vec[i]);
					i += 1;
				}
				out.insert(key, value);
			}
		}
	}
	// Done
	out
}

pub fn ui_main() {
	// Used by almost every command
	let assembler_config = resources::load_assembler_config().expect("Unable to load assembler config");
	// Warning if ceratain features are enabled
	#[cfg(feature = "replicate_stack_issue")]
	{
		println!("WARNING: Certain feature(s) are enabled which are meant to replicate faults in the computer");
	}
	// Parse arguments
	let args: Vec<String> = env::args().collect();
	if args.len() < 2 {// Just the program name, default to running the server GUI
		panic!("Not enough arguments, see crate::ui_maine()");
	}
	else {
		match &args[1][..] {
			"-assemble" => {
				println!("Not implemented");
			},
			"-assemble-line" => {
				if args.len() < 3 {
					println!("Plz include single line of assembly");
				}
				else {
					match compiler::compiler_pipeline_formated_errors(&args[2..].join(" "), &assembler_config) {
						Ok(program) => println!("Instruction: {}, {:#X}, {:#018b}", program[0], program[0], program[0]),
						Err(s) => panic!("{}", s)
					};
				}
			},
			"-assemble-file" => {
				if args.len() < 3 {
					println!("Plz include name of file in `/assembly_sources`");
				}
				else {
					compiler::assemble_file(&args[2], &assembler_config).unwrap();
				}
			},
			"-assemble-upload" => {
				if args.len() < 3 {
					println!("Plz include name of file in `{}`", resources::ASSEMBLY_SOURCES_DIR);
				}
				else {
					let name = &args[2];
					let path: String = resources::ASSEMBLY_SOURCES_DIR.to_owned() + name;
					let file_raw = match fs::read_to_string(&path) {
						Ok(s) => s,
						Err(e) => panic!("Could not load test file at \"{}\" because {}", &path, e)
					};
					match compiler::compiler_pipeline_formated_errors(&file_raw, &assembler_config) {
						Ok(program) => {
							match program_upload::send_program(&program) {
								Ok(()) => println!("Program at {} uploaded", &path),
								Err(e) => println!("Upload error: {}", e)
							}
						},
						Err(s) => println!("{}", s)
					}
				}
			},
			"-assemble-to-arduino-function" => {
				let parsed_args: HashMap<String, String> = parse_args(&args);
				let name = parsed_args.get("name").expect("Missing argument `name`");
				let offset: Option<u16> = match parsed_args.get("offset") {
					Some(offset_raw) => Some(offset_raw.parse::<u16>().expect("Offset must be a u16")),
					None => None
				};
				let len_: Option<u16> = match parsed_args.get("len") {
					Some(len_raw) => Some(len_raw.parse::<u16>().expect("Length must be a u16")),
					None => None
				};
				let chip_erase: bool = parsed_args.get("erase").is_some();
				let path: String = resources::ASSEMBLY_SOURCES_DIR.to_owned() + name;
				let file_raw = match fs::read_to_string(&path) {
					Ok(s) => s,
					Err(e) => panic!("Could not load test file at \"{}\" because {}", &path, e)
				};
				match compiler::compiler_pipeline_formated_errors(&file_raw, &assembler_config) {
					Ok(program) => {
						println!("```\n{}```", assemble_to_arduino(&program, offset, len_, chip_erase));
					},
					Err(s) => println!("{}", s)
				}
			},
			"-compile" => {
				println!("Not implemented");
			},
			"-run-with-cli" => {
				if args.len() < 3 {
					println!("Plz include name of file in `{}`", resources::ASSEMBLY_SOURCES_DIR);
				}
				else {
					let name = &args[2];
					let path: String = resources::ASSEMBLY_SOURCES_DIR.to_owned() + name;
					let file_raw = match fs::read_to_string(&path) {
						Ok(s) => s,
						Err(e) => panic!("Could not load test file at \"{}\" because {}", &path, e)
					};
					match compiler::compiler_pipeline_formated_errors(&file_raw, &assembler_config) {
						Ok(program) => {
							let mut machine = Machine::new(program);
							machine.run(&mut CliInterface::new()).unwrap();
						},
						Err(s) => println!("{}", s)
					}
				}
			},
			"-run-with-display" => {
				if args.len() < 3 {
					println!("Plz include name of file in `{}`", resources::ASSEMBLY_SOURCES_DIR);
				}
				else {
					let name = &args[2];
					let path: String = resources::ASSEMBLY_SOURCES_DIR.to_owned() + name;
					let file_raw = match fs::read_to_string(&path) {
						Ok(s) => s,
						Err(e) => panic!("Could not load test file at \"{}\" because {}", &path, e)
					};
					match compiler::compiler_pipeline_formated_errors(&file_raw, &assembler_config) {
						Ok(program) => {
							let machine = Machine::new(program);
							display_emulator::start_gui(machine);
						},
						Err(s) => println!("{}", s)
					}
				}
			},
			_ => panic!("Invalid arguments")
		}
	}
}