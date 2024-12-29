//! Module for emulating the hardware

use std::fmt::Write;

#[allow(unused)]
use crate::prelude::*;

/// Generalization of components
trait MachineComponent {
	/// Initial state
	fn new() -> Self;
}

// Structs
pub struct StackController {
	top_pointer: u16,
	offset: u8,
}

impl StackController {
	/// Pushes value onto stack
	pub fn push(&mut self, value: u8, mem: &mut [u8; POWER_16]) {
		self.top_pointer = self.top_pointer.wrapping_add(1);
		mem[self.top_pointer as usize] = value;
	}
	/// Pops of the top of the stack, optionaly deletes the value afterwards
	pub fn pop(&mut self, mem: &[u8; POWER_16]) -> u8 {
		let out: u8 = mem[self.top_pointer as usize];
		self.top_pointer = self.top_pointer.wrapping_sub(1);
		// Done
		out
	}
	pub fn offset_read(&self, mem: &mut [u8; POWER_16]) -> u8 {
		mem[(self.top_pointer.wrapping_add(self.offset as u16 + 0xFF00).wrapping_add(1)) as usize]
	}
	pub fn offset_write(&self, value: u8, mem: &mut [u8; POWER_16]) {
		mem[(self.top_pointer.wrapping_add(self.offset as u16 + 0xFF00).wrapping_add(1)) as usize] = value;
	}
	/// Does exactly what the hardware does
	/// ```
	/// use stack_machine::emulator::StackController;
	/// assert_eq!(StackController::compute_offset(0x0000, 0xFF), 0x0000);
	/// assert_eq!(StackController::compute_offset(0x0009, 0xFD), 0x0007);
	/// ```
	pub fn compute_offset(top: u16, offset: u8) -> u16 {
		top.wrapping_add((offset as u16) | 0xFF00).wrapping_add(1)
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
			0 => {// ADD
				a.wrapping_add(b)
			},
			1 => {// ADD-C
				(((a as u16) + (b as u16)) > 255) as u8
			},
			2 => {// NOT
				!a
			},
			3 => {// OR
				a | b
			},
			4 => {// AND
				a & b
			},
			5 => {// XNOR
				!(a ^ b)
			},
			6 => {// SHIFT
				a << (b & 0b111)
			},
			7 => {// EQ
				(a == b) as u8
			},
			8 => {// A
				a
			},
			9 => {// B
				b
			},
			10 => {// EXT-10
				return Err(EmulationErrorEnum::InvalidAluOpcode(opcode))
			},
			11 => {// EXT-11
				return Err(EmulationErrorEnum::InvalidAluOpcode(opcode))
			},
			12 => {// EXT-12
				return Err(EmulationErrorEnum::InvalidAluOpcode(opcode))
			},
			13 => {// EXT-13
				return Err(EmulationErrorEnum::InvalidAluOpcode(opcode))
			},
			14 => {// EXT-14
				return Err(EmulationErrorEnum::InvalidAluOpcode(opcode))
			},
			15 => {// EXT-15
				return Err(EmulationErrorEnum::InvalidAluOpcode(opcode))
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
	execution_pointer: u16,
	goto_latch_a: u8,
	goto_latch_b: u8,
	goto_decider_latch: bool,
	program_size: u16,
	clock_counter: u16
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
			execution_pointer: 0,
			goto_latch_a: 0,
			goto_latch_b: 0,
			goto_decider_latch: false,
			program_size: prog.len() as u16,
			clock_counter: 0
		}
	}
	/// Executes 1 instruction
	/// Returns: Ok(whether to stop the clock (HALT)) or Err(EmulationError)
	pub fn execute_instruction<T: GpioInterface>(&mut self, gpio_interface: &mut T) -> Result<bool, EmulationError> {
		// TODO: Increment `self.clock_counter`
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
				let res = self.get_bus_value(bus_write_addr, gpio_interface, alu_opcode);
				let bus_value: u8 = self.err_enum_result_to_err_result(res)?;
				debug_print(&format!("  MOVE read_addr={:#X}, write_addr={:#X}, bus_value={:#X}", bus_read_addr, bus_write_addr, bus_value));
				// Send bus value
				let res = self.send_bus_value(bus_read_addr, bus_value, gpio_interface);
				self.err_enum_result_to_err_result(res)?;
			},
			1 => {// WRITE
				let read_addr = (second_byte >> 4) & 0x0F;
				let bus_value = ((instruction >> 4) & 0x00FF) as u8;
				debug_print(&format!("  WRITE read_addr={:#X}, bus_value={:#X}", read_addr, bus_value));
				let res = self.send_bus_value(read_addr, bus_value, gpio_interface);
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
				self.call_stack_top = self.call_stack_top.wrapping_add(1);
				self.call_stack[self.call_stack_top as usize] = self.execution_pointer;
				self.goto()
			},
			6 => {// RETURN
				self.execution_pointer = self.call_stack[self.call_stack_top as usize];
				self.call_stack_top = self.call_stack_top.wrapping_sub(1);
			},
			n => return Err(EmulationError::new(EmulationErrorEnum::InvalidOpcode(n), self.execution_pointer))
		};
		// Increment execution pointer
		self.execution_pointer = self.execution_pointer.wrapping_add(1);
		debug_print("");
		// Done
		Ok(false)
	}
	fn send_bus_value<T: GpioInterface>(&mut self, read_addr: u8, bus_value: u8, gpio_interface: &mut T) -> Result<(), EmulationErrorEnum> {
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
				self.general_mem_controller.pointer = (self.general_mem_controller.pointer & 0xFF00) | (bus_value as u16)
			},
			10 => {// GPRAM-ADDR-B
				self.general_mem_controller.pointer = (self.general_mem_controller.pointer & 0x00FF) | ((bus_value as u16) << 8)
			},
			11 => {// GPIO-WRITE-A
				gpio_interface.write_a(bus_value);
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
			15 => {// GPIO-WRITE-B
				gpio_interface.write_b(bus_value);
			},
			_ => return Err(EmulationErrorEnum::InvalidBusReadAddr(read_addr))
		}
		Ok(())
	}
	fn get_bus_value<T: GpioInterface>(&mut self, write_addr: u8, gpio_interface: &mut T, alu_opcode: u8) -> Result<u8, EmulationErrorEnum> {
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
			8 => {// GPIO-READ-A
				gpio_interface.read_a()
			},
			9 => {// CLK-COUNTER-A
				(self.clock_counter & 0x00FF) as u8
			},
			10 => {// CLK-COUNTER-B
				((self.clock_counter >> 8) & 0x00FF) as u8
			},
			11 => {// GPIO-READ-B
				gpio_interface.read_b()
			},
			_ => return Err(EmulationErrorEnum::InvalidBusWriteAddr(write_addr))
		})
	}
	fn goto(&mut self) {
		let next_pointer = self.goto_latch_a as u16 + ((self.goto_latch_b as u16) * 256);
		debug_print(&format!("  GOTO curr pointer={:#X}, next={:#X} + 1", self.execution_pointer, next_pointer));
		self.execution_pointer = next_pointer;
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
	pub fn run<T: GpioInterface>(&mut self, gpio_interface: &mut T) -> Result<(), EmulationError> {
		loop {
			if self.execute_instruction(gpio_interface)? {
				return Ok(());
			}
		}
	}
}

pub trait GpioInterface {
	fn write_a(&mut self, _in: u8) {}
	fn write_b(&mut self, _in: u8) {}
	fn read_a(&mut self) -> u8 {0x00}
	fn read_b(&mut self) -> u8 {0x00}
}

pub struct GpioInterfaceDoesNothing;

impl GpioInterface for GpioInterfaceDoesNothing {}

pub struct CliInterface {
	current_out_buffer: String
}

impl CliInterface {
	pub fn new() -> Self {
		Self {
			current_out_buffer: String::new()
		}
	}
}

impl GpioInterface for CliInterface {
	fn write_a(&mut self, in_: u8) {
		let char_: char = in_ as char;
		if in_ == 0x0A {// Just a Linefeed, Windows can fuck off
			println!("{}", self.current_out_buffer);
			self.current_out_buffer.clear();
		}
		else {
			self.current_out_buffer.write_char(char_).unwrap();
		}
	}
	fn write_b(&mut self, _in: u8) {
		println!("N: {}", _in);
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
	#[allow(unused)]
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
	pub fn to_string(&self) -> String {
		format!("{:?} with the program pointer at {}", self.enum_, self.prog_addr)
	}
}

#[inline]
fn debug_print(_msg: &str) {
	#[cfg(feature = "emulator_debug")]
	println!("{}", _msg);
}