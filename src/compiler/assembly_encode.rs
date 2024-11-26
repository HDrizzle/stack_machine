//! Translating assembly directly to machine code, the last step in compilation

use serde::{Serialize, Deserialize};

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
	pub fn get_4_bit_assembly_word(&self, token: &Token, correct_context: Assembler4BitWordContext) -> Result<AssemblyWord<4>, AssemblyEncodeErrorEnum> {
		if let TokenEnum::AssemblyWord(word_raw) = &token.enum_ {
			match self.encode_4_bit_word(correct_context, word_raw) {
				Some(word) =>Ok(word),
				None => {
					Err(AssemblyEncodeErrorEnum::TokenWordInWrongContext{token_raw: token.raw.clone(), correct_context})
				}
			}
		}
		else {// Token is not an assembly word
			Err(AssemblyEncodeErrorEnum::TokenWordInWrongContext{token_raw: token.raw.clone(), correct_context})
		}
	}
}

/// Parts of the assembly syntax, seperated by spaces and newlines
#[derive(Clone, Debug, PartialEq, Eq)]
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
	pub fn decode(in_: &str) -> Result<Self, AssemblyEncodeErrorEnum> {
		if in_.starts_with("0x") {
			let hex_str = &in_[2..in_.len()];
			let hex_decode: Vec<u8> = match hex::decode(hex_str) {
				Ok(data) => data,
				Err(e) => return Err(AssemblyEncodeErrorEnum::HexLiteralInvalid(e))
			};
			let n_bits: usize = (in_.len() - 2) * 4;//hex_decode.len() * 4;
			if n_bits != 8 {
				return Err(AssemblyEncodeErrorEnum::HexLiteralWrongLength{correct_len_bits: 8, actual_len_bits: n_bits as u32});
			}
			Ok(Self::Literal{n: hex_decode[0], bit_size: n_bits as u8})
		}
		else {
			Ok(Self::AssemblyWord(in_.to_owned()))
		}
	}
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Token {
	pub enum_: TokenEnum,
	pub raw: String
}

impl Token {
    pub fn new(enum_: TokenEnum, raw: String) -> Self {
        Self {
            enum_,
            raw
        }
    }
	pub fn decode(in_: &str) -> Result<Self, AssemblyEncodeErrorEnum> {
		Ok(Self {
			enum_: TokenEnum::decode(in_)?,
			raw: in_.to_owned()
		})
	}
}

/// Takes the instruction as a vec of tokens, tries to assemble it into an instruction
pub fn assemble_instruction(line: &Vec<Token>, config: &AssemblerConfig) -> Result<u16, (AssemblyEncodeErrorEnum, Option<String>)> {
	// Opcode
	let opcode: AssemblyWord<4> = if let TokenEnum::AssemblyWord(word) = &line[0].enum_ {
		match config.encode_4_bit_word(Assembler4BitWordContext::Opcode, &word) {
			Some(opc) => opc,
			None => {return Err((AssemblyEncodeErrorEnum::InvalidToken(line[0].raw.clone()), None));}
		}
	}
	else {// First token in line is not an assembly word
		return Err((AssemblyEncodeErrorEnum::InvalidToken(line[0].raw.clone()), None));
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
					return Err((AssemblyEncodeErrorEnum::IncorrectNumberOfTokensForOpcode{opcode: opcode.clone(), n_tokens_in_line: n}, Some("There must be either 3 or 4 tokens in a `MOVE` line".to_owned())));
				}
			};
			let alu_opcode: u8 = match alu_opcode_included {
				true => {
					match config.get_4_bit_assembly_word(&line[1], Assembler4BitWordContext::AluOpcode) {
						Ok(word) => word.id_,
						Err(err_enum) => {return Err((err_enum, None));}
					}
				},
				false => {// TODO
					0x00//return Err((AssemblyEncodeErrorEnum::UnspecifiedAluOpcode, None));
				}
			};
			// From and to address
			let (write_addr_token, read_addr_token): (&Token, &Token) = match alu_opcode_included {
				true => (&line[2], &line[3]),
				false => (&line[1], &line[2])
			};
			let write_addr: u8 = match config.get_4_bit_assembly_word(write_addr_token, Assembler4BitWordContext::ToBus) {
				Ok(word) => word.id_,
				Err(err_enum) => {return Err((err_enum, None));}
			};
			let read_addr: u8 = match config.get_4_bit_assembly_word(read_addr_token, Assembler4BitWordContext::FromBus) {
				Ok(word) => word.id_,
				Err(err_enum) => {return Err((err_enum, None));}
			};
			// Add to instruction
			instruction |= (alu_opcode << 4) as u16 | (((write_addr | ((read_addr << 4) & 0xF0u8)) as u16) << 8);
		},
		"write" => {
			// Check number of tokens
			if line.len() != 3 {
				return Err((AssemblyEncodeErrorEnum::IncorrectNumberOfTokensForOpcode{opcode, n_tokens_in_line: line.len()}, None));
			}
			// Bits 4 - 11 raw hex value
			let write_value_token = &line[1];
			let write_value: u8 = if let TokenEnum::Literal{n, bit_size} = &write_value_token.enum_ {
				if *bit_size == 8 {
					*n
				}
				else {
					return Err((AssemblyEncodeErrorEnum::HexLiteralWrongLength{correct_len_bits: 8, actual_len_bits: *bit_size as u32}, None));
				}
			}
			else {
				return Err((AssemblyEncodeErrorEnum::LiteralTokenInWrongContext{token: write_value_token.clone()}, None));
			};
			// Bus read addr
			let read_addr_token = &line[2];
			let read_addr: u8 = match config.get_4_bit_assembly_word(read_addr_token, Assembler4BitWordContext::FromBus) {
				Ok(word) => word.id_,
				Err(err_enum) => {return Err((err_enum, None));}
			};
			// Add to instruction
			instruction |= ((write_value as u16) << 4) | ((read_addr as u16) << 12);
		},
		_ => {}// All other instructions don't require any additional information besides the opcode
	}
	// Done
	Ok(instruction)
}

#[derive(Debug)]
pub enum AssemblyEncodeErrorEnum {
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
	},
    UnspecifiedAluOpcode
}