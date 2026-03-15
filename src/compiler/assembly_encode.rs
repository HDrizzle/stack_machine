//! Translating assembly directly to machine code, the last step in compilation

use serde::Deserialize;

/// For each "unit" of the assembly code, names of opcodes and devices to read/write the bus, etc.
#[derive(Deserialize, Clone, Debug)]
pub struct AssemblyWord {
	/// May be represented by less then 8 bits
	pub id_: u8,
	/// Name of this in the assembly program
	pub name: String
}

#[derive(Clone, Copy, Debug)]
pub enum AssemblerWordContext {
	Opcode,
	AluOpcode,
	ToBus,
	FromBus,
	#[cfg(feature = "version_2")]
	AfterCall,
	#[cfg(feature = "version_2")]
	AfterReturn,
	#[cfg(feature = "version_2")]
	GenericAfterOpcode
}

/// All the data about the assembly words
#[derive(Deserialize)]
pub struct AssemblerConfig {
	pub opcodes: Vec<AssemblyWord>,
	pub alu_opcodes: Vec<AssemblyWord>,
	pub to_bus: Vec<AssemblyWord>,
	pub from_bus: Vec<AssemblyWord>,
	#[cfg(feature = "version_2")]
	pub after_call: Vec<AssemblyWord>,
	#[cfg(feature = "version_2")]
	pub after_return: Vec<AssemblyWord>,
	#[cfg(feature = "version_2")]
	pub generic_after_opcode: Vec<AssemblyWord>
}

impl AssemblerConfig {
	pub fn encode_word(&self, word_type: AssemblerWordContext, raw: &str) -> Option<AssemblyWord> {
		self.encode_generic_word(
			match word_type {
				AssemblerWordContext::Opcode => &self.opcodes,
				AssemblerWordContext::AluOpcode => &self.alu_opcodes,
				AssemblerWordContext::ToBus => &self.to_bus,
				AssemblerWordContext::FromBus => &self.from_bus,
				#[cfg(feature = "version_2")]
				AssemblerWordContext::AfterCall => &self.after_call,
				#[cfg(feature = "version_2")]
				AssemblerWordContext::AfterReturn => &self.after_return,
				#[cfg(feature = "version_2")]
				AssemblerWordContext::GenericAfterOpcode => &self.generic_after_opcode
			},
			raw
		)
	}
	fn encode_generic_word(&self, words: &Vec<AssemblyWord>, raw: &str) -> Option<AssemblyWord> {
		for word_config in words {
			if word_config.name.to_lowercase() == raw.to_lowercase() {
				return Some(word_config.clone());
			}
		}
		// Done
		None
	}
	pub fn get_assembly_word(&self, token: &Token, correct_context: AssemblerWordContext) -> Result<AssemblyWord, AssemblyEncodeErrorEnum> {
		if let TokenEnum::AssemblyWord(word_raw) = &token.enum_ {
			match self.encode_word(correct_context, word_raw) {
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
			if n_bits != 8 {// The only context where literal number are decoded is in `WRITE` instructions which require 8 bits
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
/// This is the only function that is compiled differently for versions 1 and 2
pub fn assemble_instruction(line: &Vec<Token>, config: &AssemblerConfig) -> Result<u16, (AssemblyEncodeErrorEnum, Option<String>)> {
	// Opcode
	let opcode: AssemblyWord = if let TokenEnum::AssemblyWord(word) = &line[0].enum_ {
		match config.encode_word(AssemblerWordContext::Opcode, &word) {
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
					match config.get_assembly_word(&line[1], AssemblerWordContext::AluOpcode) {
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
			let mut write_addr: u8 = match config.get_assembly_word(write_addr_token, AssemblerWordContext::ToBus) {
				Ok(word) => word.id_,
				Err(err_enum) => {return Err((err_enum, None));}
			};
			let mut read_addr: u8 = match config.get_assembly_word(read_addr_token, AssemblerWordContext::FromBus) {
				Ok(word) => word.id_,
				Err(err_enum) => {return Err((err_enum, None));}
			};
			// FOR VERSION 2: Check if move opcode needs to be changed for 5-bit bus address compatibility
			#[cfg(feature = "version_2")]
			{
				/*
				8. `MOVE` - MSBs TX=1, RX=0
				9. `MOVE` - MSBs TX=0, RX=1
				10. `MOVE` - MSBs TX=1, RX=1
				11. `WRITE` - MSBs RX=1
				*/
				let tx_rx_msbs: u8 = ((write_addr >> 3) & 0b10) | ((read_addr >> 4) & 0b1);
				let new_opcode: u16 = match tx_rx_msbs {
					0b00 => 0,
					0b01 => 9,
					0b10 => 8,
					0b11 => 10,
					_ => panic!("Logic error")
				};
				// Update instruction for new opcode
				instruction = (instruction & 0xFFF0) | (new_opcode & 0b1111);
			}
			write_addr = write_addr & 0b1111;
			read_addr = read_addr & 0b1111;
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
			let mut write_value: u8 = if let TokenEnum::Literal{n, bit_size} = &write_value_token.enum_ {
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
			let mut read_addr: u8 = match config.get_assembly_word(read_addr_token, AssemblerWordContext::FromBus) {
				Ok(word) => word.id_,
				Err(err_enum) => {return Err((err_enum, None));}
			};
			// Check if writing to the stack offset
			if read_addr == 13 {
				write_value = 0xFF - write_value;
			}
			// FOR VERSION 2: Check if move opcode needs to be changed for 5-bit bus address compatibility
			#[cfg(feature = "version_2")]
			{
				/*
				8. `MOVE` - MSBs TX=1, RX=0
				9. `MOVE` - MSBs TX=0, RX=1
				10. `MOVE` - MSBs TX=1, RX=1
				11. `WRITE` - MSBs RX=1
				*/
				if (read_addr >> 4) & 1 == 1 {// If 5th bit is high, change write opcode
					instruction = (instruction & 0xFFF0) | 11;
				}
			}
			read_addr = read_addr & 0b1111;
			// Add to instruction
			instruction |= ((write_value as u16) << 4) | ((read_addr as u16) << 12);
		},
		#[allow(unused)]// In case of not version 2 where `other` would not be used
		other => {// For call, return, config-int
			#[cfg(feature = "version_2")]
			if let Some(word_context) = match other {
				"call" => Some(AssemblerWordContext::AfterCall),
				"return" => Some(AssemblerWordContext::AfterReturn),
				"config-int" => Some(AssemblerWordContext::GenericAfterOpcode),
				_ => None
			} {
				// Check number of tokens
				if !(line.len() == 1 || line.len() == 2) {
					return Err((AssemblyEncodeErrorEnum::IncorrectNumberOfTokensForOpcode{opcode, n_tokens_in_line: line.len()}, None));
				}
				if line.len() == 2 {
					let after_opcode_flag: u8 = match config.get_assembly_word(&line[1], word_context) {
						Ok(word) => word.id_,
						Err(err_enum) => {return Err((err_enum, None));}
					};
					instruction |= (after_opcode_flag as u16 & 0xF) << 4;
				}
			}
		}
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
		opcode: AssemblyWord,
		n_tokens_in_line: usize
	},
	TokenWordInWrongContext {
		token_raw: String,
		correct_context: AssemblerWordContext
	},
	LiteralTokenInWrongContext {
		token: Token
	},
    UnspecifiedAluOpcode
}