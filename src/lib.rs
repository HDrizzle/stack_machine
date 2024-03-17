//! Maine library file

pub mod assembler;
pub mod compiler;
pub mod emulator;
pub mod resources;

/// Prelude
pub mod prelude {
    pub use crate::assembler::{AssemblyWord, Opcode, AssemblerConfig};
    pub use crate::resources;
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
}

pub use crate::prelude::*;

pub fn ui_main() {
    println!("Hello, world!");
}