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
    pub prog_mem: [u8; POWER_16],
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
    pub fn new(prog: Vec<u8>) -> Self {
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
        let byte_1: u8 = self.prog_mem[self.execution_pointer as usize];
        // Match opcode
        let opcode: u8 = byte_1 % 16;
        let pre_opcode = byte_1 - opcode;
        let prog_bytes_read: u8 = match opcode {
            0 => {// MOVE
                // Get next value
                let rw_addrs: u8 = self.prog_mem[self.execution_pointer as usize + 1];
                // Match opcode
                let write_addr = rw_addrs % 16;
                let read_addr = rw_addrs - write_addr;
                // Get bus value
                let bus_value: u8 = self.err_enum_result_to_err_result(self.get_bus_value(write_addr))?;
                // Send bus value
                self.err_enum_result_to_err_result(self.send_bus_value(read_addr, bus_value))?;
                // Bytes used
                2
            },
            1 => {// PUSH
                2
            },
            2 => {// GOTO
                1
            },
            3 => {// STACK-OFFSET
                3
            },
            4 => {// STACK-OFFSET-CLR
                1
            },
            5 => {// HALT
                return Ok(true);
            },
            n => return Err(EmulationError::new(EmulationErrorEnum::InvalidOpcode(opcode), self.execution_pointer))
        };
        // Increment execution pointer
        self.execution_pointer += prog_bytes_read as u16;
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
                // TODO
            },
            12 => {// GPIO-WRITE
                // TODO
            },
            _ => return Err(EmulationErrorEnum::InvalidBusReadAddr(read_addr))
        }
        Ok(())
    }
    fn get_bus_value(&mut self, write_addr: u8) -> Result<u8, EmulationErrorEnum> {
        Ok(match write_addr {
            0 => {},
            1 => {},
            2 => {},
            3 => {},
            4 => {},
            5 => {},
            6 => {},
            7 => {},
            8 => {},
            9 => {},
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
    InvalidBusWriteAddr(u8)
}

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