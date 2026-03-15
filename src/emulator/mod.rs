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
		#[cfg(feature = "replicate_stack_issue")]
		{
			mem[self.top_pointer as usize] = value;
		}
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
	/// ```
	/// use stack_machine::emulator::ALU;
	/// let mut alu = ALU{latch_a: 0x0F, latch_b: 0x06, latch_c: 0x00};
	/// assert_eq!(alu.compute(6).unwrap(), 0b11000011);
	/// alu = ALU{latch_a: 0b00111100, latch_b: 0x02, latch_c: 0x00};
	/// assert_eq!(alu.compute(6).unwrap(), 0b11110000);
	/// ```
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
				//WrappingShl::wrapping_shl(&a, (b & 0b111) as u32)
				//(a << (b & 0b111)) | (a >> (8 - (b & 0b111)))
				//a << (b & 0b111)
				a.rotate_left((b & 0b111) as u32)// Thanks ChatGPT
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

/// Read and Write pointers are incremented AFTER push/pop
#[cfg(feature = "version_2")]
struct InterruptHandler {
	pub enabled: bool,
	pub interrupt_queue: [u8; 256],
	pub read_pointer: u8,
	pub write_pointer: u8,
	pub interrupt_counter: u8
}

#[cfg(feature = "version_2")]
impl InterruptHandler {
	fn push(&mut self, source: u8, extra: u8) {
		let interrupt_code: u8 = if source >= 4 {
			(source & 0b111) & ((extra & 0xF) << 4)
		}
		else {
			source & 0b111// Timers, no extra info
		};
		self.interrupt_queue[self.write_pointer as usize] = interrupt_code;
		self.write_pointer = self.write_pointer.wrapping_add(1);
		self.interrupt_counter = self.interrupt_counter.wrapping_add(1);
	}
	fn pop(&mut self) -> u8 {
		let out = self.interrupt_queue[self.read_pointer as usize];
		self.read_pointer = self.read_pointer.wrapping_add(1);
		self.interrupt_counter = self.interrupt_counter.wrapping_add(255);
		out
	}
}

#[cfg(feature = "version_2")]
impl MachineComponent for InterruptHandler {
	fn new() -> Self {
		Self {
			enabled: false,// Hardware flag is set to false on startup
			interrupt_queue: [0; 256],
			read_pointer: 0,
			write_pointer: 0,
			interrupt_counter: 0
		}
	}
}

/// Timers
#[cfg(feature = "version_2")]
struct Timers {
	/// 1 MHz in hardware, 36 bits used
	base_timer: u64,
	interrupt_timers_state: [u8; 4],
	/// Max value, timer will roll over after going PAST this, not too it. This is so that 255 will cause the timer to rollover normally.
	interrupt_timers_max: [u8; 4],
	/// Timebase 3:0, Interrupt 4, Enable 5
	interrupt_timers_timebase_and_enable: [u8; 4],
	/// Same as the bus input except only first 2 bits are used
	int_and_main_timer_address: u8
}

#[cfg(feature = "version_2")]
impl Timers {
	/// Updates interrupt timers
	/// Returns: Vec of interrupt codes
	pub fn update(&mut self, clock_cycles: u64) -> Vec<u8> {
		self.base_timer = self.base_timer.wrapping_add(clock_cycles) & 0x0000000FFFFFFFFF;// 36 bits used
		let mut out = Vec::new();
		// For each of the 4 timers
		for i in 0..4_usize {
			if (self.interrupt_timers_timebase_and_enable[i] >> 5) & 1 == 1 {
				let max = self.interrupt_timers_max[i];
				let to_overflow = max - self.interrupt_timers_state[i];
				if clock_cycles >= (to_overflow as u64) {
					let diff = clock_cycles - (to_overflow as u64);
					let n_overflows = diff / ((max as u64) + 1);
					if (self.interrupt_timers_timebase_and_enable[i] >> 4) & 1 == 1 {// Check whether this timer can cause interrupts
						for _ in 0..n_overflows {
							out.push(i as u8 & 0b111);
						}
					}
				}
				// TODO: Update count
			}
		}
		out
	}
	pub fn set_int_and_main_timer_address(&mut self, bus_value: u8) {
		self.int_and_main_timer_address = bus_value & 0b11;
		if (bus_value >> 2) & 1 == 1 {// Bit 2 is a flag to clear given interrupt timer
			self.interrupt_timers_state[self.int_and_main_timer_address as usize] = 0;
		}
	}
	pub fn set_int_timer_max(&mut self, bus_value: u8) {
		self.interrupt_timers_max[self.int_and_main_timer_address as usize] = bus_value;
	}
}

#[cfg(feature = "version_2")]
impl MachineComponent for Timers {
	fn new() -> Self {
		Self {
			base_timer: 0,
			interrupt_timers_state: [0; 4],
			interrupt_timers_max: [255; 4],
			interrupt_timers_timebase_and_enable: [0; 4],
			int_and_main_timer_address: 0
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
	clock_counter: u16,
	pub clock_counter_perf_tracking: u128,
	#[cfg(feature = "version_2")]
	interrupt_handler: InterruptHandler,
	#[cfg(feature = "version_2")]
	timers: Timers
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
			clock_counter: 0,
			clock_counter_perf_tracking: 0,
			#[cfg(feature = "version_2")]
			interrupt_handler: InterruptHandler::new(),
			#[cfg(feature = "version_2")]
			timers: Timers::new()
		}
	}
	/// Executes 1 instruction
	/// Returns: Ok(whether to stop the clock (HALT)) or Err(EmulationError)
	pub fn execute_instruction<T: GpioInterface>(&mut self, gpio_interface: &mut T) -> Result<bool, EmulationError> {
		// Check that execution pointer is within limits
		if self.execution_pointer >= self.program_size {
			return Err(self.err_enum_to_err(EmulationErrorEnum::ExecutionPointerExceededProgramSize));
		}
		// Get instruction
		let instruction: u16 = {
			let mut out= self.prog_mem[self.execution_pointer as usize];
			// Version 2 feature to load from GPRAM
			#[cfg(feature = "version_2")]
			if self.execution_pointer >> 15 & 1 == 1 {
				let gpram_start: u16 = (self.execution_pointer & 0x7FFF) << 1;
				out = (self.general_mem[gpram_start as usize] as u16) | ((self.general_mem[gpram_start as usize + 1] as u16) << 8);
			}
			out
		};
		let second_byte: u8 = ((instruction >> 8) & 255u16) as u8;
		let opcode: u8 = (instruction & 15u16) as u8;
		let alu_opcode: u8 = ((instruction >> 4) & 0x000Fu16) as u8;
		// Bus read/write addresses, may not be used
		let bus_write_addr = second_byte & 0x0F;
		let bus_read_addr = (second_byte >> 4) & 0x0F;
		// Debug print
		debug_print(&format!("Instruction={:#X}(#{:#X}), opcode={:#X}", instruction, self.execution_pointer, opcode));
		// Match opcode
		let mut halt: bool = false;
		let instruction_clock_counts: u16 = match opcode {
			0 => {// MOVE
				// Get next value
				// Get bus value
				let res = self.get_bus_value(bus_write_addr, gpio_interface, alu_opcode);
				let bus_value: u8 = self.err_enum_result_to_err_result(res)?;
				debug_print(&format!("  MOVE read_addr={:#X}, write_addr={:#X}, bus_value={:#X}", bus_read_addr, bus_write_addr, bus_value));
				// Send bus value
				let res = self.send_bus_value(bus_read_addr, bus_value, gpio_interface);
				self.err_enum_result_to_err_result(res)?;
				// A/B clock cycles
				5
			},
			1 => {// WRITE
				let read_addr = (second_byte >> 4) & 0x0F;
				let bus_value = ((instruction >> 4) & 0x00FF) as u8;
				debug_print(&format!("  WRITE read_addr={:#X}, bus_value={:#X}", read_addr, bus_value));
				let res = self.send_bus_value(read_addr, bus_value, gpio_interface);
				self.err_enum_result_to_err_result(res)?;
				// A/B clock cycles
				5
			},
			2 => {// GOTO
				self.goto();
				// A/B clock cycles
				1
			},
			3 => {// GOTO-IF
				debug_print(&format!("  GOTO-IF"));
				if self.goto_decider_latch {
					self.goto();
				}
				// A/B clock cycles
				1
			},
			4 => {// HALT
				halt = true;
				// A/B clock cycles
				1
			},
			5 => {// CALL
				// Push return address
				self.call_stack_top = self.call_stack_top.wrapping_add(1);
				self.call_stack[self.call_stack_top as usize] = self.execution_pointer;
				self.goto();
				// A/B clock cycles
				2
			},
			6 => {// RETURN
				self.execution_pointer = self.call_stack[self.call_stack_top as usize];
				self.call_stack_top = self.call_stack_top.wrapping_sub(1);
				// A/B clock cycles
				1
			},
			n => return Err(EmulationError::new(EmulationErrorEnum::InvalidOpcode(n), self.execution_pointer))
		};
		// Increment clock, counting cycles of the base clock, ignoring the phases
		let total_clock_cycles: u16 = (instruction_clock_counts+1)*4;
		self.clock_counter = self.clock_counter.wrapping_add(total_clock_cycles);
		self.clock_counter_perf_tracking += total_clock_cycles as u128;
		// Increment execution pointer
		self.execution_pointer = self.execution_pointer.wrapping_add(1);
		debug_print("");
		// Done
		Ok(halt)
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