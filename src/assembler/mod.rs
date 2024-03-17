//! Functionality to turn assembly into binary
use serde::{Serialize, Deserialize};
use hex;

use crate::prelude::*;

/// For each "unit" of the assembly code, names of opcodes and devices to read/write the bus, etc.
#[derive(Serialize, Deserialize)]
pub struct AssemblyWord<const BIT_SIZE: u8> {
    /// Actually represented by 4 bits but this is the best matching type
    pub id_: u8,
    /// Name of this in the assembly program
    pub name: String
}

/// Beginning of each instruction
#[derive(Serialize, Deserialize)]
pub struct Opcode {
    /// Assembly word
    pub word: AssemblyWord<8>,
    /// The number of program bytes following this opcode
    pub following_bytes: u8
}

/// All the data about the assembly words
#[derive(Serialize, Deserialize)]
pub struct AssemblerConfig {
    pub opcodes: Vec<Opcode>,
    pub pre_opcodes: Vec<AssemblyWord<4>>,
    pub to_bus: Vec<AssemblyWord<4>>,
    pub from_bus: Vec<AssemblyWord<4>>
}

/// Parts of the assembly syntax, seperated by spaces and newlines
enum Token {
    Literal {
        n: u8,
        bit_size: u8
    },
    AssemblyWord(String)
}

impl Token {
    pub fn decode(in_: &str) -> Result<Self, String> {
        if in_.starts_with("0x") {
            let hex_str = &in_[2..in_.len()];
            if hex_str.len() > 2 {
                return Err(format!("Hex literal \"{}\" must be no longer than a byte", in_));
            }
            let hex_decode = to_string_err(hex::decode(hex_str))?;
            Ok(Self::Literal{n: hex_decode[0], bit_size: (hex_str.len() * 4) as u8})
        }
        else {
            Ok(Self::AssemblyWord(in_.to_owned()))
        }
    }
}

/// Turn raw string (probably from assembly source file) into machine code
pub fn assembler_pipeline(in_: &str, config: &AssemblerConfig) -> Result<Vec<u8>, String> {
    let tokens = tokenize(in_, config)?;
    // TODO
}

pub fn tokenize(in_: &str, config: &AssemblerConfig) -> Result<Vec<Token>, String> {

}