//! Maine library file

use std::env;

pub mod assembler;
pub mod compiler;
pub mod emulator;
pub mod resources;
#[cfg(test)]
mod tests;

/// Prelude
pub mod prelude {
    pub use crate::assembler::{AssemblyWord, AssemblerConfig};
    pub use crate::resources;
    pub use crate::emulator::Machine;
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
			"-compile" => {
				println!("Not implemented");
			},
			_ => panic!("Invalid arguments")
		}
	}
}