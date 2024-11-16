//! Module for uploading binaries to an attatched arduino for it to upload to the computer

use std::time::Duration;
use serialport::{available_ports, SerialPort, SerialPortInfo};
use dialoguer;
use crate::prelude::*;

const CODE_CHIP_ERASED: u8 = 0b10000000;
const CODE_WRITE_DONE: u8 = 0b10000001;

pub fn send_program(program: &Vec<u16>) -> Result<(), String> {
	// Procedure is commented in the arduino side code
	// Get port
	let port_info: SerialPortInfo = port_choose_cli()?;
	let mut port: Box<dyn SerialPort> = serialport::new(&port_info.port_name, 9600).timeout(Duration::from_secs(5)).open().expect(&format!("Failed to open port \"{}\"", &port_info.port_name));
	to_string_err(port.set_baud_rate(9600))?;
	// Create program size buffer
	let mut prog_size_write_buf = Vec::<u8>::new();
	// Put program size in buffer
	let size_u16: u16 = program.len() as u16;
	let size_lower: u8 = (size_u16 & 0x00FF) as u8;
	let size_upper: u8 = ((size_u16 >> 8) & 0x00FF) as u8;
	prog_size_write_buf.push(size_lower);
	prog_size_write_buf.push(size_upper);
	// Check that two bytes were written
	match port.write(&prog_size_write_buf) {
		Ok(bytes_written) => if bytes_written == 2 {}
		else {
			return Err(format!("{} bytes were written, however the program size consists of 2 bytes", bytes_written));
		}
		Err(e) => {return Err(format!("Serial write error on prog size upload: {}", e));}
	}
	// Wait for chip erase code
	let mut buff: Vec<u8> = vec![0; 1];
	match port.read(buff.as_mut_slice()) {
		Ok(bytes_recieved) => if bytes_recieved != 1 {
			return Err(format!("Reading serial for chip erase confirmation did not return 1 byte, instead {} bytes", bytes_recieved))
		},
		Err(e) => {return Err(format!("Serial read error waiting for chip erase confirmation: {}", e));}
	}
	if buff[0] != CODE_CHIP_ERASED {
		return Err(format!("Chip erased confirmation ({}) does not match", buff[0]));
	}
	// Write program
	for instruction in program {
	// Put instructions in buffer
		let instruction_lower: u8 = (instruction & 0x00FF) as u8;
		let instruction_upper: u8 = ((instruction >> 8) & 0x00FF) as u8;
		let write_buff: Vec<u8> = vec![instruction_lower, instruction_upper];
		// Check that write worked
		match port.write(&write_buff) {
			Ok(bytes_written) => if bytes_written == 2 {}
			else {
				return Err(format!("{} bytes were written, there should be 2 bytes written for each instruction", bytes_written));
			}
			Err(e) => {return Err(format!("Serial write error on prog upload: {}", e));}
		}
		// Wait for response
		let read_buff: Vec<u8> = vec![0; 1];
		match port.read(buff.as_mut_slice()) {
			Ok(bytes_recieved) => if bytes_recieved != 1 {
				return Err(format!("Reading serial for progress check did not return 1 byte, instead {} bytes", bytes_recieved))
			},
			Err(e) => {return Err(format!("Serial read error waiting for progress check: {}", e));}
		}
		println!("Progress: {}%", read_buff[0]);
	}
	// Check for done code
	let mut read_buff: Vec<u8> = vec![0; 1];
	match port.read(read_buff.as_mut_slice()) {
		Ok(bytes_recieved) => if bytes_recieved != 1 {
			return Err(format!("Reading serial for upload finish confirmation did not return 1 byte, instead {} bytes", bytes_recieved))
		},
		Err(e) => {return Err(format!("Serial read error waiting for upload finish confirmation: {}", e));}
	}
	if buff[0] != CODE_WRITE_DONE {
		return Err(format!("Write done confirmation ({}) does not match", buff[0]));
	}
	// Done
	Ok(())
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