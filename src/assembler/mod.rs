//! Functionality to turn assembly into binary
use std::{fmt::Debug, fs};
use serde::{Serialize, Deserialize};
use hex;

use crate::prelude::*;

/// For each "unit" of the assembly code, names of opcodes and devices to read/write the bus, etc.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AssemblyWord<const BIT_SIZE: u8> {
	/// May be represented by less then 8 bits
	pub id_: u8,
	/// Name of this in the assembly program
	pub name: String
}

#[derive(Clone, Copy, Debug)]
pub enum Assembler4BitWordContext {
	Opcode,
	AluOpcode,
	ToBus,
	FromBus
}

/// All the data about the assembly words
#[derive(Serialize, Deserialize)]
pub struct AssemblerConfig {
	pub opcodes: Vec<AssemblyWord<4>>,
	pub alu_opcodes: Vec<AssemblyWord<4>>,
	pub to_bus: Vec<AssemblyWord<4>>,
	pub from_bus: Vec<AssemblyWord<4>>
}

impl AssemblerConfig {
	pub fn encode_4_bit_word(&self, word_type: Assembler4BitWordContext, raw: &str) -> Option<AssemblyWord<4>> {
		self.encode_generic_4_bit_word(
			match word_type {
				Assembler4BitWordContext::Opcode => &self.opcodes,
				Assembler4BitWordContext::AluOpcode => &self.alu_opcodes,
				Assembler4BitWordContext::ToBus => &self.to_bus,
				Assembler4BitWordContext::FromBus => &self.from_bus
			},
			raw
		)
	}
	fn encode_generic_4_bit_word(&self, words: &Vec<AssemblyWord<4>>, raw: &str) -> Option<AssemblyWord<4>> {
		for word_config in words {
			if word_config.name.to_lowercase() == raw.to_lowercase() {
				return Some(word_config.clone());
			}
		}
		// Done
		None
	}
	pub fn get_4_bit_assembly_word(&self, token: &Token, correct_context: Assembler4BitWordContext) -> Result<AssemblyWord<4>, AssemblerErrorEnum> {
		if let TokenEnum::AssemblyWord(word_raw) = &token.enum_ {
			match self.encode_4_bit_word(correct_context, word_raw) {
				Some(word) =>Ok(word),
				None => {
					Err(AssemblerErrorEnum::TokenWordInWrongContext{token_raw: token.raw.clone(), correct_context})
				}
			}
		}
		else {// Token is not an assembly word
			Err(AssemblerErrorEnum::TokenWordInWrongContext{token_raw: token.raw.clone(), correct_context})
		}
	}
}

#[derive(Debug)]
pub enum AssemblerErrorEnum {
	HexLiteralInvalid(hex::FromHexError),
	HexLiteralWrongLength {
		correct_len_bits: u32,
		actual_len_bits: u32
	},
	InvalidToken(String),
	IncorrectNumberOfTokensForOpcode {
		opcode: AssemblyWord<4>,
		n_tokens_in_line: usize
	},
	TokenWordInWrongContext {
		token_raw: String,
		correct_context: Assembler4BitWordContext
	},
	LiteralTokenInWrongContext {
		token: Token
	}
}

/// Assembler error
pub struct AssemblerError {
	/// Line numbers will start at 1 :(
	pub line_n: usize,
	/// Raw text of line
	pub line: String,
	/// Specific message
	pub message_opt: Option<String>,
	/// Specific error
	pub enum_: AssemblerErrorEnum
}

impl AssemblerError {
	pub fn new(
		line_n: usize,
		line: String,
		message_opt: Option<String>,
		enum_: AssemblerErrorEnum
	) -> Self {
		Self {
			line_n,
			line,
			message_opt,
			enum_
		}
	}
	pub fn format(&self) -> String {
		format!(
			"Error on line {}: {:?}\n\t{}{}\n",
			self.line_n,
			self.enum_,
			self.line,
			match &self.message_opt {
				Some(msg) => format!("\n\n\t{}", msg.clone()),
				None => "".to_owned()
			}
		)
	}
}

/// Parts of the assembly syntax, seperated by spaces and newlines
#[derive(Clone, Debug)]
pub enum TokenEnum {
	/// Hexadecimal literal
	Literal {
		/// Number
		n: u8,
		/// Length in bits, NOTE: this is not the minimum number of bits used to represent the number, it is (length of the raw value - `0x`) * 4
		bit_size: u8
	},
	/// Regular assembly word
	AssemblyWord(String)
}

impl TokenEnum {
	pub fn decode(in_: &str) -> Result<Self, AssemblerErrorEnum> {
		if in_.starts_with("0x") {
			let hex_str = &in_[2..in_.len()];
			let hex_decode: Vec<u8> = match hex::decode(hex_str) {
				Ok(data) => data,
				Err(e) => return Err(AssemblerErrorEnum::HexLiteralInvalid(e))
			};
			let n_bits: usize = (in_.len() - 2) * 4;//hex_decode.len() * 4;
			if n_bits != 8 {
				return Err(AssemblerErrorEnum::HexLiteralWrongLength{correct_len_bits: 8, actual_len_bits: n_bits as u32});
			}
			Ok(Self::Literal{n: hex_decode[0], bit_size: n_bits as u8})
		}
		else {
			Ok(Self::AssemblyWord(in_.to_owned()))
		}
	}
}

#[derive(Clone, Debug)]
pub struct Token {
	pub enum_: TokenEnum,
	pub raw: String
}

impl Token {
	pub fn decode(in_: &str) -> Result<Self, AssemblerErrorEnum> {
		Ok(Self {
			enum_: TokenEnum::decode(in_)?,
			raw: in_.to_owned()
		})
	}
}

/// Turn raw string (probably from assembly source file) into machine code
pub fn assembler_pipeline(in_: &str, config: &AssemblerConfig) -> Result<Vec<u16>, Vec<AssemblerError>> {
	let mut out = Vec::<u16>::new();
	let mut errors = Vec::<AssemblerError>::new();
	// Split into lines
	let raw_lines: Vec<&str> = in_.split("\n").collect();
	// Convienience closure function
	let mut add_error = |line_index: usize, message_opt: Option<String>, error_enum: AssemblerErrorEnum| {
		errors.push(AssemblerError::new(line_index+1, raw_lines[line_index].to_owned(), message_opt, error_enum));
	};
	// Tokenize
	let token_lines: Vec<Vec<Token>> = tokenize(in_, config)?;
	// Assemble
	for (i, line) in token_lines.iter().enumerate() {
		if line.len() >= 1 {
			// Opcode
			let opcode: AssemblyWord<4> = if let TokenEnum::AssemblyWord(word) = &line[0].enum_ {
				match config.encode_4_bit_word(Assembler4BitWordContext::Opcode, &word) {
					Some(opc) => opc,
					None => {
						add_error(i, None, AssemblerErrorEnum::InvalidToken(line[0].raw.clone()));
						continue;
					}
				}
			}
			else {// First token in line is not an assembly word
				add_error(i, Some("First token in line must be an assembly word corresponding to an opcode".to_owned()), AssemblerErrorEnum::InvalidToken(line[0].raw.clone()));
				continue;
			};
			let mut instruction: u16 = (opcode.id_ & 0x0Fu8) as u16;
			// Anything after it
			match &opcode.name[..] {
				"move" => {
					// ALU opcode
					let alu_opcode_included = match line.len() {
						3 => false,// MOVE <source> <destination>
						4 => true,// MOVE <ALU opcode> <source> <destination>
						n => {
							add_error(i, Some("There must be either 3 or 4 tokens in a `MOVE` line".to_owned()), AssemblerErrorEnum::IncorrectNumberOfTokensForOpcode{opcode: opcode.clone(), n_tokens_in_line: n});
							continue;
						}
					};
					let alu_opcode: u8 = match alu_opcode_included {
						true => {
							match config.get_4_bit_assembly_word(&line[1], Assembler4BitWordContext::AluOpcode) {
								Ok(word) => word.id_,
								Err(err_enum) => {
									add_error(i, None, err_enum);
									continue;
								}
							}
						},
						false => {// default ALU opcode, TODO: warning if this instruction is moving data from the ALU
							0x00
						}
					};
					// From and to address
					let (write_addr_token, read_addr_token): (&Token, &Token) = match alu_opcode_included {
						true => (&line[2], &line[3]),
						false => (&line[1], &line[2])
					};
					let write_addr: u8 = match config.get_4_bit_assembly_word(write_addr_token, Assembler4BitWordContext::ToBus) {
						Ok(word) => word.id_,
						Err(err_enum) => {
							add_error(i, None, err_enum);
							continue;
						}
					};
					let read_addr: u8 = match config.get_4_bit_assembly_word(read_addr_token, Assembler4BitWordContext::FromBus) {
						Ok(word) => word.id_,
						Err(err_enum) => {
							add_error(i, None, err_enum);
							continue;
						}
					};
					// Add to instruction
					instruction |= (alu_opcode << 4) as u16 | (((write_addr | ((read_addr << 4) & 0xF0u8)) as u16) << 8);
				},
				"write" => {
					// Check number of tokens
					if line.len() != 3 {
						add_error(i, None, AssemblerErrorEnum::IncorrectNumberOfTokensForOpcode{opcode, n_tokens_in_line: line.len()});
						continue;
					}
					// Bits 4 - 11 raw hex value
					let write_value_token = &line[1];
					let write_value: u8 = if let TokenEnum::Literal{n, bit_size} = &write_value_token.enum_ {
						if *bit_size == 8 {
							*n
						}
						else {
							add_error(i, None, AssemblerErrorEnum::HexLiteralWrongLength{correct_len_bits: 8, actual_len_bits: *bit_size as u32});
							continue;
						}
					}
					else {
						add_error(i, None, AssemblerErrorEnum::LiteralTokenInWrongContext{token: write_value_token.clone()});
						continue;
					};
					// Bus read addr
					let read_addr_token = &line[2];
					let read_addr: u8 = match config.get_4_bit_assembly_word(read_addr_token, Assembler4BitWordContext::FromBus) {
						Ok(word) => word.id_,
						Err(err_enum) => {
							add_error(i, None, err_enum);
							continue;
						}
					};
					// Add to instruction
					instruction |= ((write_value as u16) << 4) | ((read_addr as u16) << 12);
				},
				_ => {}// All other instructions don't require any additional information besides the opcode
			}
			// Add instruction to program
			out.push(instruction);
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

pub fn assembler_pipeline_formated_errors(in_: &str, config: &AssemblerConfig) -> Result<Vec<u16>, String> {
	match assembler_pipeline(in_, config) {
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

fn tokenize(in_: &str, _config: &AssemblerConfig) -> Result<Vec<Vec<Token>>, Vec<AssemblerError>> {
	// TODO: ignore comments
	let mut errors = Vec::<AssemblerError>::new();
	let mut token_lines = Vec::<Vec<Token>>::new();
	for (i, line) in in_.split("\n").enumerate() {
		let mut tokens = Vec::<Token>::new();
		for token_raw in line.split(" ") {
			match Token::decode(token_raw) {
				Ok(token) => tokens.push(token),
				Err(err_enum) => errors.push(AssemblerError::new(i+1, line.to_owned(), None, err_enum))
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
}

/// Attempts to run assembler on given file in `assembly_sources`
pub fn assemble_file(name: &str, assembler_config: &AssemblerConfig) -> Result<(), String> {
	let path: String = resources::ASSEMBLY_SOURCES_DIR.to_owned() + name;
	let file_raw = to_string_err(fs::read_to_string(&path))?;
	match assembler_pipeline_formated_errors(&file_raw, assembler_config) {
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