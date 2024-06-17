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
	top_pointer: u16,
	offset: u8,
}

impl StackController {
	/// Pushes value onto stack
	pub fn push(&mut self, value: u8, mem: &mut [u8; POWER_16]) {
		self.top_pointer += 1;
		mem[self.top_pointer as usize] = value;
	}
	/// Pops of the top of the stack, optionaly deletes the value afterwards
	pub fn pop(&mut self, mem: &[u8; POWER_16]) -> u8 {
		let out: u8 = mem[self.top_pointer as usize];
		self.top_pointer -= 1;
		// Done
		out
	}
	pub fn offset_read(&self, mem: &mut [u8; POWER_16]) -> u8 {
		mem[(self.top_pointer - (self.offset as u16)) as usize]
	}
	pub fn offset_write(&self, value: u8, mem: &mut [u8; POWER_16]) {
		mem[(self.top_pointer - (self.offset as u16)) as usize] = value;
	}
}

impl MachineComponent for StackController {
	fn new() -> Self {
		Self {
			top_pointer: 0,
			offset: 0
		}
	}
}

pub struct ALU {
	pub latch_a: u8,
	pub latch_b: u8,
	pub latch_c: u8
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
			9 => {// EQ
				(a == b) as u8
			},
			10 => {// BOOL-EQ (only uses LSB)
				!((a & 0x01) ^ (b & 0x01))
			},
			11 => {// >
				(a > b) as u8
			},
			12 => {// A
				a
			},
			13 => {// B
				b
			},
			14 => {// C
				(((a as u16) + (b as u16)) > 255) as u8
			},
			15 => {// TWOS-COMP
				a.wrapping_neg()
			},
			_ => return Err(EmulationErrorEnum::InvalidAluOpcode(opcode))
		})
	}
}

impl MachineComponent for ALU {
	fn new() -> Self {
		Self {
			latch_a: 0,
			latch_b: 0,
			latch_c: 0
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

/// Represents state of entire computer
pub struct Machine {
	pub prog_mem: [u16; POWER_16],
	pub stack_mem: [u8; POWER_16],
	pub general_mem: [u8; POWER_16],
	call_stack: [u16; 256],
	call_stack_top: u8,
	stack_controller: StackController,
	pub alu: ALU,
	general_mem_controller: GeneralMemController,
	gpio_output: u8,
	execution_pointer: u16,
	goto_latch_a: u8,
	goto_latch_b: u8,
	goto_decider_latch: bool,
	program_size: u16
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
			call_stack: [0; 256],
			call_stack_top: 0,
			stack_controller: StackController::new(),
			alu: ALU::new(),
			general_mem_controller: GeneralMemController::new(),
			gpio_output: 0,
			execution_pointer: 0,
			goto_latch_a: 0,
			goto_latch_b: 0,
			goto_decider_latch: false,
			program_size: prog.len() as u16
		}
	}
	/// Executes 1 instruction
	/// Returns: Ok(whether to stop the clock (HALT)) or Err(EmulationError)
	pub fn execute_instruction(&mut self, gpio_in: u8) -> Result<bool, EmulationError> {
		// Check that execution pointer is within limits
		if self.execution_pointer >= self.program_size {
			return Err(self.err_enum_to_err(EmulationErrorEnum::ExecutionPointerExceededProgramSize));
		}
		// Get instruction
		let instruction: u16 = self.prog_mem[self.execution_pointer as usize];
		let second_byte: u8 = ((instruction >> 8) & 255u16) as u8;
		let opcode: u8 = (instruction & 15u16) as u8;
		let alu_opcode: u8 = ((instruction >> 4) & 0x000Fu16) as u8;
		// Bus read/write addresses, may not be used
		let bus_write_addr = second_byte & 0x0F;
		let bus_read_addr = (second_byte >> 4) & 0x0F;
		// Debug print
		debug_print(&format!("Instruction={:#X}(#{:#X}), opcode={:#X}", instruction, self.execution_pointer, opcode));
		// Match opcode
		match opcode {
			0 => {// MOVE
				// Get next value
				// Get bus value
				let res = self.get_bus_value(bus_write_addr, gpio_in, alu_opcode);
				let bus_value: u8 = self.err_enum_result_to_err_result(res)?;
				debug_print(&format!("  MOVE read_addr={:#X}, write_addr={:#X}, bus_value={:#X}", bus_read_addr, bus_write_addr, bus_value));
				// Send bus value
				let res = self.send_bus_value(bus_read_addr, bus_value);
				self.err_enum_result_to_err_result(res)?;
			},
			1 => {// WRITE
				let read_addr = (second_byte >> 4) & 0x0F;
				let bus_value = ((instruction >> 4) & 0x00FF) as u8;
				debug_print(&format!("  WRITE read_addr={:#X}, bus_value={:#X}", read_addr, bus_value));
				let res = self.send_bus_value(read_addr, bus_value);
				self.err_enum_result_to_err_result(res)?;
			},
			2 => {// GOTO
				self.goto()
			},
			3 => {// GOTO-IF
				debug_print(&format!("  GOTO-IF"));
				if self.goto_decider_latch {
					self.goto()
				}
			},
			4 => {// HALT
				return Ok(true);
			},
			5 => {// CALL
				// Push return address
				self.call_stack_top += 1;
				self.call_stack[self.call_stack_top as usize] = self.execution_pointer;
				self.goto()
			},
			6 => {// RETURN
				self.execution_pointer = self.call_stack[self.call_stack_top as usize];
				self.call_stack_top -= 1;
			},
			n => return Err(EmulationError::new(EmulationErrorEnum::InvalidOpcode(n), self.execution_pointer))
		};
		// Increment execution pointer
		self.execution_pointer += 1;
		debug_print("");
		// Done
		Ok(false)
	}
	fn send_bus_value(&mut self, read_addr: u8, bus_value: u8) -> Result<(), EmulationErrorEnum> {
		match read_addr {
			0 => {},// NONE
			1 => {// STACK-PUSH
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
			6 => {// GOTO-DECIDER
				self.goto_decider_latch = (bus_value & 1u8) == 1
			},
			7 => {// GPRAM
				self.general_mem_controller.write(bus_value, &mut self.general_mem, false);
			},
			8 => {// GPRAM-INC-ADDR
				self.general_mem_controller.write(bus_value, &mut self.general_mem, true);
			},
			9 => {// GPRAM-ADDR-A
				self.general_mem_controller.pointer |= (self.general_mem_controller.pointer & 0xFF00) | (bus_value as u16)
			},
			10 => {// GPRAM-ADDR-B
				self.general_mem_controller.pointer |= (self.general_mem_controller.pointer & 0x00FF) | ((bus_value as u16) << 8)
			},
			11 => {// GPIO-WRITE
				self.gpio_output = bus_value;
			},
			12 => {// STACK-OFFSET-WRITE
				self.stack_controller.offset_write(bus_value, &mut self.stack_mem);
			},
			13 => {// SET-STACK-OFFSET
				self.stack_controller.offset = bus_value;
			},
			14 => {// ALU-C-IN
				self.alu.latch_c = bus_value;
			},
			_ => return Err(EmulationErrorEnum::InvalidBusReadAddr(read_addr))
		}
		Ok(())
	}
	fn get_bus_value(&mut self, write_addr: u8, gpio_in: u8, alu_opcode: u8) -> Result<u8, EmulationErrorEnum> {
		Ok(match write_addr {
			0 => {// STACK-POP
				self.stack_controller.pop(&mut self.stack_mem)
			},
			1 => {// STACK-OFFSET-READ
				self.stack_controller.offset_read(&mut self.stack_mem)
			},
			2 => {// ALU
				self.alu.compute(alu_opcode)?
			},
			3 => {// Control unit WRITE instruction, this will be used in the actual machine, but the emulator does this elsewhere
				return Err(EmulationErrorEnum::AttemptedReadFromControlUnit);
			},
			4 => {// GPRAM
				self.general_mem_controller.read(&self.general_mem, false)
			},
			5 => {// GPRAM-INC-ADDR
				self.general_mem_controller.read(&self.general_mem, true)
			},
			6 => {// GPRAM-ADDR-A
				(self.general_mem_controller.pointer & 0x00FF) as u8
			},
			7 => {// GPRAM-ADDR-B
				((self.general_mem_controller.pointer >> 8) & 0x00FF) as u8
			},
			8 => {// GPIO-READ
				gpio_in
			},
			_ => return Err(EmulationErrorEnum::InvalidBusWriteAddr(write_addr))
		})
	}
	fn goto(&mut self) {
		let next_pointer = self.goto_latch_a as u16 + ((self.goto_latch_b as u16) * 256);
		debug_print(&format!("  GOTO curr pointer={:#X}, next={:#X}", self.execution_pointer, next_pointer));
		self.execution_pointer = next_pointer - 1;// The execute instruction function will then increment this
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
	pub fn run(&mut self, mut gpio_interactor: impl FnMut(u8) -> u8) -> Result<(), EmulationError> {
		loop {
			let gpio_in: u8 = gpio_interactor(self.gpio_output);
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
	AttemptedReadFromControlUnit,
	ExecutionPointerExceededProgramSize
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

#[inline]
fn debug_print(msg: &str) {
	#[cfg(feature = "emulator_debug")]
	println!("{}", msg);
}