//! Maine library file

use std::{env, fs};

pub mod assembler;
pub mod compiler;
pub mod emulator;
pub mod resources;
pub mod program_upload;
#[cfg(test)]
mod tests;

/// Prelude
pub mod prelude {
    pub use crate::assembler::{AssemblyWord, AssemblerConfig};
    pub use crate::resources;
    pub use crate::emulator::Machine;
	/// To prevent typoes
	pub const POWER_16: usize = 0x10000;
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
	// Used by almost every command
	let assembler_config = resources::load_assembler_config().expect("Unable to load assembler config");
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
					match assembler::assembler_pipeline_formated_errors(&args[2..].join(" "), &assembler_config) {
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
					assembler::assemble_file(&args[2], &assembler_config).unwrap();
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
					match assembler::assembler_pipeline_formated_errors(&file_raw, &assembler_config) {
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
			"-compile" => {
				println!("Not implemented");
			},
			_ => panic!("Invalid arguments")
		}
	}
}