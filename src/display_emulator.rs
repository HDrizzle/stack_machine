//! Creates a UI that simulates the 32 x 32 display as well as key bindings

use std::{time::{Instant, Duration}, collections::HashMap};

use crate::emulator::EmulationError;
use crate::prelude::*;
use eframe::egui;
use eframe::egui::Key;

// CONSTS
const DISPLAY_WIDTH: usize = 32;
const DISPLAY_HEIGHT: usize = 32;
const PIXEL_SIZE: usize = 15;
const MACHINE_CLOCK: usize = 200000;

struct GpioInterfaceDisplay {
	pub display_state: [u8; 128],
	pub current_address: u8,
	pub current_data: u8,
	pub input: u16
}

impl GpioInterfaceDisplay {
	pub fn new() -> Self {
		Self {
			display_state: [0; 128],
			current_address: 0,
			current_data: 0,
			input: 0
		}
	}
	fn update_display(&mut self) {
		//println!("Update display at address: {}, data: {:#08b}", self.current_address, self.current_data);
		self.display_state[(self.current_address & 0x7F) as usize] = self.current_data;
	}
}

impl GpioInterface for GpioInterfaceDisplay {
	fn read_a(&mut self) -> u8 {
		(self.input & 0x00FF) as u8
	}
	fn read_b(&mut self) -> u8 {
		((self.input >> 8) & 0x00FF) as u8
	}
	fn write_a(&mut self, _in: u8) {
		self.current_address = _in;
	}
	fn write_b(&mut self, _in: u8) {
		self.current_data = _in;
		self.update_display();// Triggered when the data is set, TODO: Put this in actual display documentation
	}
}

struct EguiApp {
	machine: Machine,
	keys: Vec<Key>,
	interface: GpioInterfaceDisplay,
	running: bool,
	is_done: bool,
	err_opt: Option<EmulationError>,
	t_reset_clock_counter: Instant,
	halt_enable: bool
}

impl EguiApp {
	pub fn new(_cc: &eframe::CreationContext<'_>, machine: Machine, keys: Vec<Key>, halt_enable: bool) -> Self {
		Self {
			machine,
			keys,
			interface: GpioInterfaceDisplay::new(),
			running: true,
			is_done: false,
			err_opt: None,
			t_reset_clock_counter: Instant::now(),
			halt_enable
		}
	}
}

impl eframe::App for EguiApp {
	fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
		// Get input
		let mut gpio_in: u16 = 0;
		for (i, key) in self.keys.iter().enumerate() {
			if ctx.input::<bool>(|i| i.key_down(*key)) {
				gpio_in += 1 << i;
			}
		}
		self.interface.input = gpio_in;
		// Step machine
		if self.running {
			loop {
				match self.machine.execute_instruction(&mut self.interface) {
					Ok(done) => {
						if done {
							self.is_done = true && self.halt_enable;
						}  
					},
					Err(e) => {
						self.is_done = true;
						self.err_opt = Some(e);
					}
				}
				// Limit performance
				let dt: Duration = self.t_reset_clock_counter.elapsed();
				if (self.machine.clock_counter_perf_tracking as f32) / dt.as_secs_f32() >= (MACHINE_CLOCK as f32) {
					break;
				}
			}
		}
		// GUI time
		egui::CentralPanel::default().show(ctx, |ui| {
			// This function by default is only run upon user interaction, so copied this from https://users.rust-lang.org/t/issues-while-writing-a-clock-with-egui/102752
			ui.ctx().request_repaint();
			if self.is_done {
				match &self.err_opt {
					Some(e) => {ui.label(e.to_string());},
					None => {ui.label("Machine halted");}
				}
			}
			else {// Regular UI
				// Input label
				ui.horizontal(|ui| {
					ui.label("Input");
					ui.code(format!("{:#018b}", self.interface.input));
					ui.label("Output");
					ui.code(format!("{:#018b}", self.interface.current_address as u16 + ((self.interface.current_data as u16) << 8)));
				});
				// Display matrix
				let stroke = egui::Stroke{width: 1.0, color: egui::Color32::from_rgb(255, 0, 0)};
				let start_offset = egui::Vec2{x: 10.0, y: 50.0};
				let pixel_size_offset = egui::Vec2{x: PIXEL_SIZE as f32 - 1.0, y: PIXEL_SIZE as f32 - 1.0};
				let (_response, painter) = ui.allocate_painter(egui::Vec2{x: (DISPLAY_WIDTH*PIXEL_SIZE) as f32 + 10.0, y: (DISPLAY_HEIGHT*PIXEL_SIZE) as f32 + 100.0}, egui::Sense{click: false, drag: false, focusable: false});
				//painter.rect_filled(egui::Rect{min: egui::Pos2{x: 100.0, y: 100.0}, max: egui::Pos2{x: 300.0, y: 300.0}}, egui::Rounding::ZERO, egui::Color32::from_gray(255));
				for y in 0..DISPLAY_HEIGHT {
					for byte_x in 0..4 {
						let i = (y*4) + byte_x;
						let current_byte: u8 = self.interface.display_state[i];
						for bit_i in 0..8 {
							if (current_byte >> bit_i) % 2 == 1 {// If LSB (after shifting by `bit_i`) is 1
								let pixel_upper_left_pos = egui::Pos2{x: ((byte_x*8 + bit_i) * PIXEL_SIZE) as f32, y: (y*PIXEL_SIZE) as f32} + start_offset;
								painter.rect_filled(egui::Rect{min: pixel_upper_left_pos, max: pixel_upper_left_pos + pixel_size_offset}, egui::Rounding::ZERO, egui::Color32::from_gray(255));
							}
						}
					}
				}
				painter.rect_stroke(
					egui::Rect{
						min: egui::Pos2{x: -1.0, y: -1.0} + start_offset,
						max: egui::Pos2{x: (PIXEL_SIZE*DISPLAY_WIDTH) as f32, y: (PIXEL_SIZE*DISPLAY_WIDTH) as f32} + start_offset + egui::Vec2{x: 1.0, y: 1.0}
					},
					egui::Rounding::ZERO,
					stroke
				);
				for vert_line_i in 1..4_usize {
					painter.line_segment(
						[
							(start_offset + egui::Vec2{x: (vert_line_i*PIXEL_SIZE*8) as f32, y: 0.0}).to_pos2(),
							(start_offset + egui::Vec2{x: (vert_line_i*PIXEL_SIZE*8) as f32, y: (32*PIXEL_SIZE) as f32}).to_pos2()
						],
						stroke
					);
				}
			}
		});
	}
}

pub fn start_gui(machine: Machine) {
	let mut key_bindings: HashMap<String, Vec<Key>> = HashMap::new();
	key_bindings.insert(
		String::from("pong"),
		vec![
			Key::ArrowLeft,
			Key::ArrowRight,
			Key::A,
			Key::D,
			Key::S,
			Key::Space
		]
	);
	key_bindings.insert(
		String::from("tetris"),
		vec![
			Key::Space,
			Key::ArrowLeft,
			Key::ArrowRight,
			Key::A,
			Key::D,
			Key::S,
			Key::W
		]
	);
	let halt_enable = false;
	let native_options = eframe::NativeOptions::default();
	eframe::run_native("Stack machine emulator", native_options, Box::new(|cc| Ok(Box::new(EguiApp::new(cc, machine, key_bindings.get("tetris").unwrap().clone(), halt_enable))))).unwrap();
}