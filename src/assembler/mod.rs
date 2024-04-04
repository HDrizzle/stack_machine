//! Functionality to turn assembly into binary
use serde::{Serialize, Deserialize};
use hex;

use crate::prelude::*;

/// For each "unit" of the assembly code, names of opcodes and devices to read/write the bus, etc.
#[derive(Serialize, Deserialize, Clone)]
pub struct AssemblyWord<const BIT_SIZE: u8> {
	/// May be represented by less then 8 bits
	pub id_: u8,
	/// Name of this in the assembly program
	pub name: String
}

/// Beginning of each instruction
#[derive(Serialize, Deserialize, Clone)]
pub struct Opcode {
	/// Assembly word
	pub word: AssemblyWord<8>,
	/// The number of program bytes following this opcode
	pub following_bytes: u8
}

pub enum AssemblerConfig4BitWords {
	PreOpcode,
	ToBus,
	FromBus
}

/// All the data about the assembly words
#[derive(Serialize, Deserialize)]
pub struct AssemblerConfig {
	pub opcodes: Vec<Opcode>,
	pub pre_opcodes: Vec<AssemblyWord<4>>,
	pub to_bus: Vec<AssemblyWord<4>>,
	pub from_bus: Vec<AssemblyWord<4>>
}

impl AssemblerConfig {
	pub fn encode_opcode(&self, opcode_raw: &str) -> Option<Opcode> {
		for opcode_config in &self.opcodes {
			if opcode_config.word.name == opcode_raw {
				return Some(opcode_config.clone());
			}
		}
		// Done
		None
	}
	pub fn encode_4_bit_word(&self, word_type: AssemblerConfig4BitWords, raw: &str) -> Option<AssemblyWord<4>> {
		self.encode_generic_4_bit_word(
			match word_type {
				AssemblerConfig4BitWords::PreOpcode => &self.pre_opcodes,
				AssemblerConfig4BitWords::ToBus => &self.to_bus,
				AssemblerConfig4BitWords::FromBus => &self.from_bus
			},
			raw
		)
	}
	fn encode_generic_4_bit_word(&self, words: &Vec<AssemblyWord<4>>, raw: &str) -> Option<AssemblyWord<4>> {
		for word_config in words {
			if word_config.name == raw {
				return Some(word_config.clone());
			}
		}
		// Done
		None
	}
}

pub enum AssemblerErrorEnum {
	HexLiteralInvalid(hex::FromHexError),
	HexLiteralWrongLength {
		correct_len_bits: u32,
		actual_len_bits: u32
	},
	InvalidToken(String),
	TokenInWrongPlace(String)
}

/// Assembler error
pub struct AssemblerError {
	/// Line numbers will start at 1 :(
	pub line_n: usize,
	pub line: String,
	pub enum_: AssemblerErrorEnum
}

impl AssemblerError {
	pub fn new(
		line_n: usize,
		line: String,
		enum_: AssemblerErrorEnum
	) -> Self {
		Self {
			line_n,
			line,
			enum_
		}
	}
}

/// Parts of the assembly syntax, seperated by spaces and newlines
enum TokenEnum {
	/// Hexadecimal literal
	Literal {
		n: u8,
		bit_size: u8
	},
	/// Regular assembly word
	AssemblyWord(String),
	/// Assembly word (in perentheses)
	ParenAssemblyWord(String)
}

impl TokenEnum {
	pub fn decode(in_: &str) -> Result<Self, AssemblerErrorEnum> {
		if in_.starts_with("0x") {
			let hex_str = &in_[2..in_.len()];
			let hex_decode: Vec<u8> = match hex::decode(hex_str) {
				Ok(data) => data,
				Err(e) => return Err(AssemblerErrorEnum::HexLiteralInvalid(e))
			};
			let n_bits: usize = hex_decode.len() * 4;
			if n_bits != 8 {
				return Err(AssemblerErrorEnum::HexLiteralWrongLength{correct_len_bits: 8, actual_len_bits: n_bits as u32});
			}
			Ok(Self::Literal{n: hex_decode[0], bit_size: n_bits as u8})
		}
		else {
			if in_.starts_with("(") && in_.ends_with(")") {
				Ok(Self::ParenAssemblyWord(in_[1..in_.len()-1].to_owned()))
			}
			else {
				Ok(Self::AssemblyWord(in_.to_owned()))
			}
		}
	}
}

struct Token {
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
pub fn assembler_pipeline(in_: &str, config: &AssemblerConfig) -> Result<Vec<u8>, Vec<AssemblerError>> {
	let mut out = Vec::<u8>::new();
	let mut errors = Vec::<AssemblerError>::new();
	// Split into lines
	let raw_lines: Vec<&str> = in_.split("\n").collect();
	// Tokenize
	let token_lines = tokenize(in_, config)?;
	// Assemble
	for (i, line) in token_lines.iter().enumerate() {
		if line.len() >= 1 {
			// Opcode
			let opcode: Opcode = if let TokenEnum::AssemblyWord(word) = &line[0].enum_ {
				match config.encode_opcode(&word) {
					Some(opc) => opc,
					None => {
						errors.push(AssemblerError::new(i+1, raw_lines[i].to_owned(), AssemblerErrorEnum::InvalidToken(line[0].raw.clone())));
						continue;
					}
				}
			}
			else {
				errors.push(AssemblerError::new(i+1, raw_lines[i].to_owned(), AssemblerErrorEnum::TokenInWrongPlace(line[0].raw.clone())));
				continue;
			};
			// Anything after it
			let mut full_first_byte: u8 = opcode.word.id_;// TODO: push to `out`
			if line.len() >= 2 {
				// Next token may be (in parens) meaning it represents 4 bits (currently only ALU instruction addressing) to be places at bits 4 - 7 in the first instruction byte
				let next_token_index: usize = if let TokenEnum::ParenAssemblyWord(word) = &line[1].enum_ {
					let pre_opcode_byte: AssemblyWord<4> = match config.encode_4_bit_word(AssemblerConfig4BitWords::PreOpcode, &word) {
						Some(word) => word,
						None => {
							errors.push(AssemblerError::new(i+1, raw_lines[i].to_owned(), AssemblerErrorEnum::InvalidToken(line[0].raw.clone())));
							continue;
						}
					};
					full_first_byte |= pre_opcode_byte.id_ << 4;
					2
				}
				else {
					1
				};
				// Finally done w/ first byte
				out.push(full_first_byte);
			}
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

/// Assembles 2 tokens after a `MOVE` instruction
fn assemble_move_addressing_byte(tokens: [&str; 2], config: &AssemblerConfig) -> Result<u8, AssemblerErrorEnum> {
	Ok(0u8)// TODO
}

fn tokenize(in_: &str, config: &AssemblerConfig) -> Result<Vec<Vec<Token>>, Vec<AssemblerError>> {
	// TODO: ignore comments
	let mut errors = Vec::<AssemblerError>::new();
	let mut lines = Vec::<Vec<Token>>::new();
	let mut block_comment_depth: usize = 0;// TODO: use
	for (i, line) in in_.split("\n").enumerate() {
		let mut tokens = Vec::<Token>::new();
		for token_raw in line.split(" ") {
			match Token::decode(token_raw) {
				Ok(token) => tokens.push(token),
				Err(err_enum) => errors.push(AssemblerError::new(i+1, line.to_owned(), err_enum))
			}
		}
		lines.push(tokens);
	}
	// Done
	if errors.len() == 0 {
		Ok(lines)
	}
	else {
		Err(errors)
	}
}