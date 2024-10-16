//! Module for uploading binaries to an attatched arduino for it to upload to the computer

use std::time::Duration;
use crate::prelude::*;
use serialport::{available_ports, SerialPort, SerialPortBuilder, SerialPortInfo};
use dialoguer;

pub fn send_program(program: &Vec<u16>) -> Result<(), String> {
	// Get port
	let port_info: SerialPortInfo = port_choose_cli()?;
	let mut port: Box<dyn SerialPort> = serialport::new(&port_info.port_name, 9600).timeout(Duration::from_secs(5)).open().expect(&format!("Failed to open port \"{}\"", &port_info.port_name));
	// Create buffer
	let mut write_buf = Vec::<u8>::new();
	for instruction in program {
		let instruction_lower: u8 = (instruction & 0x00FF) as u8;
		let instruction_upper: u8 = ((instruction >> 8) & 0x00FF) as u8;
		write_buf.push(instruction_lower);
		write_buf.push(instruction_upper);
	}
	match port.write(&write_buf) {
		Ok(bytes_written) => if bytes_written == program.len() * 2 {
			Ok(())
		}
		else {
			Err(format!("{} bytes were written, however the program is {} bytes", bytes_written, program.len() * 2))
		}
		Err(e) => Err(format!("Serial write error: {}", e))
	}
}

pub fn port_choose_cli() -> Result<SerialPortInfo, String> {
	// Get list of ports
	let ports: Vec<SerialPortInfo> = match available_ports() {
		Ok(ports) => ports,
		Err(e) => return Err(format!("{}", e.to_string()))
	};
	// Print options
	println!("Available serial ports (choose one):");
	for (i, port) in ports.iter().enumerate() {
		println!("{}: {}", i, &port.port_name);
	}
	// Get user input
	loop {
		let in_raw: String = dialoguer::Input::new().with_prompt("Port #").interact_text().unwrap();
		if let Ok(in_parsed) = in_raw.parse::<usize>() {
			if in_parsed < ports.len() {
				return Ok(ports[in_parsed].clone());
			}
		}
	}
}