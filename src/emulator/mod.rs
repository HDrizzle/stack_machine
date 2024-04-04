//! Module for emulating the hardware

use crate::prelude::*;

/// To prevent typoes
const POWER_16: usize = 0x10000;

/// Generalization of components
trait MachineComponent {
	/// Initial state
	fn new() -> Self;
}

// Structs

struct StackController {
	top_pointer: u16
}

impl StackController {
	/// Pushes value onto stack
	pub fn push(&mut self, value: u8, mem: &mut [u8; POWER_16]) {
		self.top_pointer += 1;
		mem[self.top_pointer as usize] = value;
	}
	/// Pops of the top of the stack, optionaly deletes the value afterwards
	pub fn pop(&mut self, delete: bool, mem: &[u8; POWER_16]) -> u8 {
		let out = mem[self.top_pointer as usize];
		if delete {
			self.top_pointer -= 1;
		}
		// Done
		out
	}
}

impl MachineComponent for StackController {
	fn new() -> Self {
		Self {
			top_pointer: 0
		}
	}
}

struct ALU {
	pub latch_a: u8,
	pub latch_b: u8
}

impl ALU {
	pub fn compute(&self, opcode: u8) -> Result<u8, EmulationErrorEnum> {
		let a = self.latch_a;
		let b = self.latch_b;
		Ok(match opcode {
			0 => {// +
				a + b
			},
			1 => {// -
			   a - b
			},
			2 => {// *
				b * b
			},
			3 => {// NOT
				!a
			},
			4 => {// OR
				a | b
			},
			5 => {// AND
				a & b
			},
			6 => {// XOR
				a ^ b
			},
			7 => {// shift L
				a << 1
			},
			8 => {// shift R
				b >> 1
			},
			10 => {// EQ
				(a == b) as u8
			},
			11 => {// BOOL-EQ (only uses LSB)
				!((a & 0x01) ^ (b & 0x01))
			},
			12 => {// >
				(a > b) as u8
			},
			13 => {// A
				a
			},
			14 => {// B
				b
			},
			_ => return Err(EmulationErrorEnum::InvalidAluOpcode(opcode))
		})
	}
}

impl MachineComponent for ALU {
	fn new() -> Self {
		Self {
			latch_a: 0,
			latch_b: 0
		}
	}
}

struct GeneralMemController {
	pub pointer: u16
}

impl GeneralMemController {
	pub fn write(&mut self, value: u8, mem: &mut [u8; POWER_16], inc_addr: bool) {
		mem[self.pointer as usize] = value;
		if inc_addr {
			self.pointer += 1;
		}
	}
	pub fn read(&mut self, mem: &[u8; POWER_16], inc_addr: bool) -> u8 {
		let out = mem[self.pointer as usize];
		if inc_addr {
			self.pointer += 1;
		}
		// Done
		out
	}
}

impl MachineComponent for GeneralMemController {
	fn new() -> Self {
		Self {
			pointer: 0
		}
	}
}

pub struct GpioOutputState {
	/// 1 is output, 0 is input
	pub io_mask: u8,
	/// Output
	pub out: u8
}

impl MachineComponent for GpioOutputState {
	fn new() -> Self {
		Self {
			io_mask: 0,
			out: 0
		}
	}
}

/// Represents state of entire computer
pub struct Machine {
	pub prog_mem: [u16; POWER_16],
	pub stack_mem: [u8; POWER_16],
	pub general_mem: [u8; POWER_16],
	stack_controller: StackController,
	alu: ALU,
	general_mem_controller: GeneralMemController,
	gpio_output: GpioOutputState,
	execution_pointer: u16,
	goto_latch_a: u8,
	goto_latch_b: u8
}

impl Machine {
	/// Creates new machine with given program
	pub fn new(prog: Vec<u16>) -> Self {
		let mut prog_mem = [0; POWER_16];
		for (i, b) in prog.iter().enumerate() {
			prog_mem[i] = *b;
		}
		// Done
		Self {
			prog_mem,
			stack_mem: [0; POWER_16],
			general_mem: [0; POWER_16],
			stack_controller: StackController::new(),
			alu: ALU::new(),
			general_mem_controller: GeneralMemController::new(),
			gpio_output: GpioOutputState::new(),
			execution_pointer: 0,
			goto_latch_a: 0,
			goto_latch_b: 0
		}
	}
	/// Executes 1 instruction
	/// Returns: Ok(whether to stop the clock (HALT)) or Err(EmulationError)
	pub fn execute_instruction(&mut self, gpio_in: u8) -> Result<bool, EmulationError> {
		// Get first instruction byte
		let instruction: u16 = self.prog_mem[self.execution_pointer as usize];
		let first_byte: u8 = (instruction % 256) as u8;
		let second_byte: u8 = ((instruction - (first_byte as u16)) / 256) as u8;
		// Match opcode
		let opcode_u16: u16 = instruction % 16;
		let opcode = opcode_u16 as u8;
		let instruction_bits_4_7: u8 = ((instruction - opcode_u16) / 16) as u8;
		match opcode_u16 {
			0 => {// MOVE
				// Get next value
				// Match opcode
				let write_addr = second_byte % 16;
				let read_addr = (second_byte - write_addr) / 16;
				// Get bus value
				let res = self.get_bus_value(write_addr, gpio_in, instruction_bits_4_7);
				let bus_value: u8 = self.err_enum_result_to_err_result(res)?;
				// Send bus value
				let res = self.send_bus_value(read_addr, bus_value);
				self.err_enum_result_to_err_result(res)?;
			},
			1 => {// MOVE
				let read_addr = second_byte >> 4 & 0x0F;
				let bus_value = (instruction >> 4 & 0x00FF) as u8;
				let res = self.send_bus_value(read_addr, bus_value);
				self.err_enum_result_to_err_result(res)?;
			},
			2 => {// GOTO
				self.execution_pointer = self.goto_latch_a as u16 + ((self.goto_latch_a as u16) * 256);
			},
			3 => {// STACK-OFFSET
				// TODO
			},
			4 => {// STACK-OFFSET-CLR
				// TODO
			},
			5 => {// HALT
				return Ok(true);
			},
			n => return Err(EmulationError::new(EmulationErrorEnum::InvalidOpcode(opcode), self.execution_pointer))
		};
		// Increment execution pointer
		self.execution_pointer += 1;
		// Done
		Ok(false)
	}
	fn send_bus_value(&mut self, read_addr: u8, bus_value: u8) -> Result<(), EmulationErrorEnum> {
		match read_addr {
			0 => {},// NONE
			1 => {// STACK
				self.stack_controller.push(bus_value, &mut self.stack_mem);
			},
			2 => {// ALU-A
				self.alu.latch_a = bus_value;
			},
			3 => {// ALU-B
				self.alu.latch_b = bus_value;
			},
			4 => {// GOTO-A
				self.goto_latch_a = bus_value;
			},
			5 => {// GOTO-B
				self.goto_latch_b = bus_value;
			},
			6 => {// GOTO-DECIDE
				self.execution_pointer = (((self.goto_latch_b as u16) * 256) + (self.goto_latch_a as u16)) - 2;// - 2 because execution pointer will be incremented by 2 after this
			},
			7 => {// SRAM
				self.general_mem_controller.write(bus_value, &mut self.general_mem, false);
			},
			8 => {// SRAM-INC-ADDR
				self.general_mem_controller.write(bus_value, &mut self.general_mem, true);
			},
			9 => {// SRAM-ADDR-A
				// TODO
			},
			10 => {// SRAM-ADDR-B
				// TODO
			},
			11 => {// GPIO-CONFIG
				self.gpio_output.io_mask = bus_value;
			},
			12 => {// GPIO-WRITE
				self.gpio_output.out = bus_value;
			},
			_ => return Err(EmulationErrorEnum::InvalidBusReadAddr(read_addr))
		}
		Ok(())
	}
	fn get_bus_value(&mut self, write_addr: u8, gpio_in: u8, pre_opcode: u8) -> Result<u8, EmulationErrorEnum> {
		Ok(match write_addr {
			0 => {// STACK-NO-POP
				self.stack_controller.pop(false, &mut self.stack_mem)
			},
			1 => {// STACK-POP
				self.stack_controller.pop(true, &mut self.stack_mem)
			},
			2 => {// ALU
				self.alu.compute(pre_opcode)?
			},
			3 => {// Control unit WRITE instruction, this will be used in the actual machine, but the emulator does this elsewhere
				return Err(EmulationErrorEnum::AttemptedReadFromControlUnit);
			},
			4 => {// PROG-ADDR-A
				(self.execution_pointer % 256) as u8
			},
			5 => {// PROG-ADDR-B
				((self.execution_pointer - (self.execution_pointer % 256)) / 256) as u8
			},
			6 => {// SRAM
				self.general_mem_controller.read(&self.general_mem, false)
			},
			7 => {// SRAM-INC-ADDR
				self.general_mem_controller.read(&self.general_mem, true)
			},
			8 => {// SRAM-ADDR-A
				(self.general_mem_controller.pointer % 256) as u8
			},
			9 => {// SRAM-ADDR-B
				((self.general_mem_controller.pointer >> 8) & 0x00FF) as u8
			},
			10 => {// GPIO-READ
				gpio_in
			},
			_ => return Err(EmulationErrorEnum::InvalidBusWriteAddr(write_addr))
		})
	}
	fn err_enum_to_err(&self, enum_: EmulationErrorEnum) -> EmulationError {
		EmulationError::new(enum_, self.execution_pointer)
	}
	fn err_enum_result_to_err_result<T>(&self, res: Result<T, EmulationErrorEnum>) -> Result<T, EmulationError> {
		match res {
			Ok(x) => Ok(x),
			Err(e) => Err(self.err_enum_to_err(e))
		}
	}
	/// Runs until error or halt
	pub fn run(&mut self, mut gpio_interactor: impl FnMut(&GpioOutputState) -> u8) -> Result<(), EmulationError> {
		loop {
			let gpio_in: u8 = gpio_interactor(&self.gpio_output);
			if self.execute_instruction(gpio_in)? {
				return Ok(());
			}
		}
	}
}

#[derive(Debug)]
pub enum EmulationErrorEnum {
	InvalidOpcode(u8),
	InvalidBusReadAddr(u8),
	InvalidBusWriteAddr(u8),
	InvalidAluOpcode(u8),
	AttemptedReadFromControlUnit
}

#[derive(Debug)]
pub struct EmulationError {
	pub enum_: EmulationErrorEnum,
	prog_addr: u16
}

impl EmulationError {
	pub fn new(
		enum_: EmulationErrorEnum,
		prog_addr: u16
	) -> Self {
		Self {
			enum_,
			prog_addr
		}
	}
}