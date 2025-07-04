import {Circle, Layout, makeScene2D, Rect, View2D, Txt, Img, Code, vector2Signal, Line, CircleSegment} from '@motion-canvas/2d';
import {all, beginSlide, waitFor, createRef, Reference, Signal, SimpleSignal, createSignal, DEFAULT, Color, Vector2Signal, Vector2, SignalTween, SimpleVector2Signal, useLogger, easeInOutCubic, SignalGenerator, delay, Logger} from '@motion-canvas/core';

/* Logic simulation & animation usage
To create a simulation:
	The main simulation will be an instance of `LogicCircuitToplevelWrapper`. to instanciate one, pass an instance of `LogicCircuit`.
The `LogicCircuit` class contains most of the simulation logic, however it does extend the `LogicDevice` class meaning it can be nested inside another larger simulation.
To interact with the simulation:
	When creating a `LogicCircuit`, the parameter `external_connections` is used to define the inputs and outputs (or bidirectional, the high-impedence status can change)
*/

export const FONT_GRID_SIZE_SCALE = 1.1;

export function logic_wire_color(in_: [state: boolean, valid: boolean]): Color {
	if(in_[1]) {
		if(in_[0]) {
			return new Color('#00FF00');
		}
		else {
			return new Color('#888888');
		}
	}
	else {
		return new Color(`#AA0000`);
	}
}

export function direction_to_unit_vec(dir: string): Vector2 {
	switch(dir.toLowerCase()) {
		case "n":
			return new Vector2(0, -1);
		case "s":
			return new Vector2(0, 1);
		case "e":
			return new Vector2(1, 0);
		case "w":
			return new Vector2(-1, 0);
	}
}

export function direction_and_rel_turn_to_unit_vec(dir: string, turn_left: boolean): Vector2 {
	if(turn_left) {
		switch(dir.toLowerCase()) {
			case "n":
				return new Vector2(-1, 0);
			case "s":
				return new Vector2(1, 0);
			case "e":
				return new Vector2(0, -1);
			case "w":
				return new Vector2(0, 1);
		}
	}
	else {
		switch(dir.toLowerCase()) {
			case "s":
				return new Vector2(-1, 0);
			case "n":
				return new Vector2(1, 0);
			case "w":
				return new Vector2(0, -1);
			case "e":
				return new Vector2(0, 1);
		}
	}
}

export function direction_to_rotation(dir: string): number {
	switch(dir.toLowerCase()) {
		case "n":
			return -90;
		case "s":
			return 90;
		case "e":
			return 180;
		case "w":
			return 0;
	}
}

// Could be a simple gate, or something more complicated like an adder, or maybe even the whole computer
export abstract class LogicDevice {
	pins: Array<LogicConnectionPin>;
	rect_ref: Reference<Rect>;
	position_grid: SimpleSignal<Vector2> | (() => Vector2);
	border_stroke: SimpleSignal<Color>;
	unique_name: string;
	pin_name_lookup: {[unique_name: string]: number};
	sub_compute_cycles: number;
	logger: Logger | Console;
	rotation: SimpleSignal<number>;
	constructor(
		pins: Array<LogicConnectionPin>,// [Position, Outgoing direction, Name], or with the length specified as something other than 1
		position_grid: SimpleSignal<Vector2> | (() => Vector2),
		unique_name: string,
		sub_compute_cycles: number = 1,// If this device (or circuit) needs extra cycles for the output to propogate correctly
		orientation: string = 'w'
	) {
		this.rotation = createSignal(direction_to_rotation(orientation));
		this.position_grid = position_grid;
		this.border_stroke = createSignal(new Color('#FFF'));
		this.unique_name = unique_name
		this.pins = pins;
		this.logger = useLogger();
		this.rect_ref = createRef<Rect>();
		this.sub_compute_cycles = sub_compute_cycles;
		if(this.sub_compute_cycles < 1) {
			throw new Error(`Sub-compute cycles must be at least 1, not ${this.sub_compute_cycles}`);
		}
		// Find pin names
		this.pin_name_lookup = {};
		for(let conn_i = 0; conn_i < this.pins.length; conn_i++) {
			let pin = this.pins[conn_i];
			// Check if name is repeated
			if(this.pin_name_lookup[pin.name] !== undefined) {
				throw new Error(`The external connection name "${pin.name}" is used at least twice`);
			}
			this.pin_name_lookup[pin.name] = conn_i;
		}
	}
	abstract init_view(parent_rect: View2D | Rect, grid_size: SimpleSignal<number>): void;
	init_view_pins(grid_size: SimpleSignal<number>) {
		for(let i = 0; i < this.pins.length; i++) {
			this.pins[i].init_view(this.rect_ref(), grid_size);
		}
	}
	// Just updates input and output states, doesn't modify color signals
	abstract compute_private(): void;
	compute(): void {
		for(let i = 0; i < this.sub_compute_cycles; i++) {
			this.compute_private();
		}
	}
	// Sets pin #pin_i with either a boolean value (externally driven) or with null (not ext driven)
	/*set_pin_state(pin_i: number, state: boolean | null): void {
		let pin = this.pins[pin_i];
		if(state !== null) {
			if(pin.internally_driven && pin.state != state) {
				throw new Error(`LogicDevice pin #${pin_i} attempt to set contests with internally driven state`);
			}
			pin.state = state;
			pin.externally_driven = true;
		}
		else {
			pin.externally_driven = false;
		}
	}*/
	set_pin_state(pin_ref: number | string, state: boolean | null): void {
		let pin = this.query_pin(pin_ref);
		if(state !== null) {
			if(pin.internally_driven) {
				if(pin.internally_driven && pin.state != state) {
					throw new Error(`LogicDevice "${this.unique_name}" pin ("${pin.name}") attempt to set contests with internally driven state, current_state=${pin.state}, new state=${state}`);
				}
			}
			else {
				pin.state = state;
				pin.externally_driven = true;
			}
		}
		else {
			pin.externally_driven = false;
		}
	}
	query_pin(pin_ref: number | string): LogicConnectionPin {
		let pin_i;
		if(typeof(pin_ref) == "string") {
			pin_i = this.pin_name_lookup[pin_ref];
		}
		else {
			pin_i = pin_ref;
		}
		let pin = this.pins[pin_i];
		if(pin === undefined) {
			throw new Error(`Pin reference ${pin_ref} is not valid for device "${this.unique_name}"`);
		}
		return pin;
	}
	// Uses `this.set_pin_state()` on all pins with `states` corresponding to pins
	set_all_pin_states(states: Array<boolean | null>): void {
		for(let i = 0; i < this.pins.length; i++) {
			this.set_pin_state(i, states[i]);
		}
	}
	// Updates color signals, if t > 0 will return a list of tweens
	animate(t: number): Array<any> {
		// Currently useless because tyhe whole logic circuit will deal with pin colors using net color signals
		// Input change tweens
		let tweens: Array<any> = [];
		/*for(let i = 0; i < this.inputs.length; i++) {
			let wire_color = logic_wire_color(this.inputs[i].state);
			if(wire_color != this.inputs[i].color()) {// Avoid useless tweens
				if(t > 0) {
					tweens.push(this.inputs[i].color(wire_color, t));
				}
				else {
					this.inputs[i].color(wire_color);
				}
			}
		}
		// Output change tweens
		for(let i = 0; i < this.outputs.length; i++) {
			let wire_color = logic_wire_color(this.outputs[i].state);
			if(t > 0) {
				tweens.push(waitFor(t).next(this.outputs[i].color(wire_color, t)));
			}
			else {
				this.outputs[i].color(wire_color);
			}
		}*/
		return tweens;
	}
	n_pins(): number {
		return this.pins.length;
	}
	// returns [state, high-Z (internal)]
	pin_state(n: number): [state: boolean, high_z: boolean] {
		let pin = this.pins[n];
		return [pin.state, !pin.internally_driven];
	}
	position_px(grid_size: SimpleSignal<number>): Vector2 {
		return this.position_grid().scale(grid_size());
	}
	set_state(_state: boolean) {
		throw new Error("Attempt to set input state on logic device instance where it is not overridden, meaning it is not an input");
	}
	static create_circuit(device: LogicDevice, grid_size: SimpleSignal<number>): LogicCircuit {
		// Creating new ones so that the same actual objects aren't referenced by the circuit and device "pins", leading to complicated issues
		let ext_conn_pins: Array<LogicConnectionPin> = [];
		let nets: Array<[Array<[string, string] | string>, [], []]> = [];
		for(let i = 0; i < device.pins.length; i++) {
			let device_pin = device.pins[i];
			let new_ext_conn = new LogicConnectionPin(device_pin.relative_start_grid, device_pin.direction, device_pin.name, device_pin.length);
			// If device's pin is set to a default value, copy it to this new circuit's external connections
			if(device_pin.externally_driven) {
				new_ext_conn.externally_driven = true;
				new_ext_conn.state = device_pin.state;
			}
			ext_conn_pins.push(new_ext_conn);
			// assign net
			nets.push([
				[[device.unique_name, device_pin.name], device_pin.name],
				[], []
			]);
		}
		// Set device's position to (0, 0) and assign its old position to the entire circuit
		let position = device.position_grid();
		device.position_grid(new Vector2(0, 0));
		return new LogicCircuit(
			[device],
			ext_conn_pins,
			nets,
			grid_size,
			createSignal(position),
			device.unique_name
		)
	}
}

export class LogicCircuit extends LogicDevice {
	components: Array<LogicDevice>;
	//external_connections: Array<[LogicConnectionPin, string]>;// pin, name. Very similar to `LogicDevice.pins`
	// List of nets, each net is a list pairs of [component index, component pin] and a color signal for animation
	nets: Array<LogicNet>;
	// Redundant w/ `nets`, just to improve performance, for component pins
	// List of (Lists of pins and corresponding net index) for each component, so `net_i = this.component_pin_to_net_lookup[component_i][pin_i]`
	component_pin_to_net_lookup: Array<Array<number>>;
	// Same as `component_pin_to_net_lookup` but for external connections
	// `net_i = ext_conn_to_net_lookup[ext_conn_i]`
	ext_conn_to_net_lookup: Array<number | null>;
	grid_size: SimpleSignal<number>;
	rect_ref: Reference<Rect>;
	position_grid: SimpleSignal<Vector2>;
	component_name_lookup: {[unique_name: string]: number};
	graphic_buses: Array<GraphicBus>;
	//external_connections_name_lookup: {[unique_name: string]: number};
	constructor(
		components: Array<LogicDevice>,
		external_connections: Array<LogicConnectionPin>,// Pin, name
		nets: Array<[
			Array<[string, string] | string>,// Components are referenced by their name and a pin name, an external connection is referenced by its name
			Array<[Vector2, Array<[number, number]>]>,// Wires (just for graphics)
			Array<Vector2> | null// Connection dots (just for graphics)
		]>,
		grid_size: SimpleSignal<number>,
		position_grid: SimpleSignal<Vector2> | (() => Vector2) = createSignal(new Vector2(0, 0)),
		unique_name: string,
		graphic_buses: Array<GraphicBus> = [],
		sub_compute_cycles: number = 1
	) {
		/*let pin_locations: Array<[Vector2, string]> = [];
		for(let conn_i = 0; conn_i < external_connections.length; conn_i++) {
			pin_locations.push([external_connections[conn_i][0].relative_start_grid, external_connections[conn_i][0].direction]);
		}*/
		super(external_connections, position_grid, unique_name, sub_compute_cycles);
		this.components = components;
		this.grid_size = grid_size;
		this.graphic_buses = graphic_buses;
		// Find component names
		this.component_name_lookup = {};
		for(let component_i = 0; component_i < this.components.length; component_i++) {
			let component = this.components[component_i];
			if(component.unique_name !== null) {
				// Check if name is repeated
				if(this.component_name_lookup[component.unique_name] !== undefined) {
					throw new Error(`The component name "${component.unique_name}" is used at least twice`);
				}
				this.component_name_lookup[component.unique_name] = component_i;
			}
		}
		// Assign nets
		this.nets = [];
		for(let net_i = 0; net_i < nets.length; net_i++) {
			let net_component_connections: Array<[number, number]> = [];
			let net_external_connections: Array<number> = [];
			for(let conn_i = 0; conn_i < nets[net_i][0].length; conn_i++) {
				let connection_query: [string, string] | string = nets[net_i][0][conn_i];
				let component_i;
				if(typeof(connection_query) == "string") {// External connection name
					let ext_conn_i = this.pin_name_lookup[connection_query];
					if(ext_conn_i == null) {
						throw new Error(`Name for external connection "${connection_query}" on net #${net_i} does not exist`);
					}
					net_external_connections.push(ext_conn_i);
				}
				else {// Component, [component name, name]
					let [component_name, pin_name] = connection_query;// Component name, look it up
					let component_i_possible_undef = this.component_name_lookup[component_name];
					if(component_i_possible_undef !== undefined) {
						component_i = component_i_possible_undef;
					}
					else {
						throw new Error(`Net #${net_i} references component "${component_name}" as part of connection, which does not exist`);
					}
					let pin_i = this.components[component_i].pin_name_lookup[pin_name];
					if(pin_i === undefined) {
						throw new Error(`Net #${net_i} references pin "${pin_name}" of component "${component_name}" as part of connection, which does not exist`);// TODO
					}
					net_component_connections.push([component_i, pin_i]);
				}
			}
			this.nets.push(new LogicNet(net_component_connections, net_external_connections, nets[net_i][1], nets[net_i][2]));
		}
		// Create pin to net lookup table
		this.component_pin_to_net_lookup = [];
		this.ext_conn_to_net_lookup = [];
		let new_nets = [];// For unconnected outputs to still have color animations
		for(let component_i = 0; component_i < this.components.length; component_i++) {
			let component_pins_lookup = [];
			for(let pin_i = 0; pin_i < this.components[component_i].n_pins(); pin_i++) {
				// Now have to look at each net to find where this pin is connected, which is why I am putting this code here for a one-time cost rather than in the loop
				let found_net_i: number | null = null;
				let n_nets_connected = 0;
				for(let net_i = 0; net_i < this.nets.length; net_i++) {
					for(let net_pin_i = 0; net_pin_i < this.nets[net_i].component_connections.length; net_pin_i++) {
						let [test_component_i, test_pin_i] = this.nets[net_i].component_connections[net_pin_i];
						if(test_component_i == component_i && test_pin_i == pin_i) {
							found_net_i = net_i;
							n_nets_connected += 1;
						}
					}
				}
				if(n_nets_connected == 0) {// Create a net just for this pin, so it's color can be animated correctly
					let new_net = new LogicNet([[component_i, pin_i]], [], [], []);
					component_pins_lookup.push(this.nets.length + new_nets.length);
					//this.components[component_i].pins[pin_i].color = new_net.color;
					n_nets_connected += 1;
					new_nets.push(new_net);
				}
				else {
					if(n_nets_connected == 1) {
						component_pins_lookup.push(found_net_i);
						// Assign pin color signal
						//this.components[component_i].pins[pin_i].color = this.nets[found_net_i].color;
					}
					else {
						throw new Error(`Pin #${pin_i} of component #${component_i} is connected to ${n_nets_connected} nets`);
					}
				}
				
			}
			this.component_pin_to_net_lookup.push(component_pins_lookup);
		}
		this.nets = this.nets.concat(new_nets);
		for(let ext_conn_i = 0; ext_conn_i < this.pins.length; ext_conn_i++) {
			// Now have to look at each net to find where this pin is connected, which is why I am putting this code here for a one-time cost rather than in the loop
			let found_net_i: number | null = null;
			let n_nets_connected = 0;
			for(let net_i = 0; net_i < this.nets.length; net_i++) {
				for(let net_conn_i = 0; net_conn_i < this.nets[net_i].external_connections.length; net_conn_i++) {
					let test_conn_i = this.nets[net_i].external_connections[net_conn_i];
					if(ext_conn_i == test_conn_i) {
						found_net_i = net_i;
						n_nets_connected += 1;
					}
				}
			}
			if(n_nets_connected == 0) {
				this.ext_conn_to_net_lookup.push(null);
			}
			else {
				if(n_nets_connected == 1) {
					this.ext_conn_to_net_lookup.push(found_net_i);
					// Assign pin color signal
					//this.pins[ext_conn_i].color = this.nets[found_net_i].color;
				}
				else {
					throw new Error(`External connection #${ext_conn_i} is connected to ${n_nets_connected} nets`);
				}
			}
		}
		this.assign_pin_signals_from_net_signals();
		this.rect_ref = createRef<Rect>();
	}
	init_view(view: View2D | Rect) {
		view.add(<Rect rotation={this.rotation} ref={this.rect_ref} position={() => this.position_grid().scale(this.grid_size())}/>);
		for(let i = 0; i < this.components.length; i++) {
			this.components[i].init_view(this.rect_ref(), this.grid_size);
		}
		// Wires & connection dots
		for(let net_i = 0; net_i < this.nets.length; net_i++) {
			let net = this.nets[net_i];
			for(let wire_i = 0; wire_i < net.wires.length; wire_i++) {
				net.wires[wire_i].init_view(this.rect_ref(), net.color, this.grid_size);
			}
			for(let dot_i = 0; dot_i < net.connection_dots.length; dot_i++) {
				this.rect_ref().add(<Circle
					position={() => net.connection_dots[dot_i].scale(this.grid_size())}
					width={() => this.grid_size()*0.5}
					height={() => this.grid_size()*0.5}
					fill={net.color}
				/>);
			}
		}
		// Buses
		for(let bus_i = 0; bus_i < this.graphic_buses.length; bus_i++) {
			this.graphic_buses[bus_i].init_view(this.rect_ref(), this.grid_size);
		}
		this.init_view_pins(this.grid_size);
	}
	assign_pin_signals_from_net_signals(): void {
		for(let component_i = 0; component_i < this.components.length; component_i++) {
			for(let pin_i = 0; pin_i < this.components[component_i].n_pins(); pin_i++) {
				this.components[component_i].pins[pin_i].color = this.nets[this.component_pin_to_net_lookup[component_i][pin_i]].color;
			}
		}
		for(let ext_conn_i = 0; ext_conn_i < this.pins.length; ext_conn_i++) {
			let net_i = this.ext_conn_to_net_lookup[ext_conn_i];
			if(net_i !== null) {
				this.pins[ext_conn_i].color = this.nets[net_i].color;
			}
		}
	}
	get_pin_grid_position(component_i: number, pin_i: number) {
		let component = this.components[component_i];
		return component.position_grid().add(component.pins[pin_i].relative_start_grid().add(direction_to_unit_vec(component.pins[pin_i].direction)));
	}
	// Returns whether simulation is stable (everything has propagated)
	// To run simulation completely, loop this function until it returns `false`
	// It may never return `false` (like of a NOT gat is connected to itself) so be sure to impose a limit to prevent infinite loops
	compute_private(): boolean {
		// For performance
		let computed_nets_dict: {[net_i: number]: [state: boolean, valid: boolean]} = {};
		// Calculate all component input pin states, DO NOT USE .compute() YET
		let component_input_states: Array<Array<boolean | null>> = [];
		for(let component_i = 0; component_i < this.components.length; component_i++) {
			let input_states = [];
			for(let pin_i = 0; pin_i < this.components[component_i].pins.length; pin_i++) {// Only iterating over input pins
				// Check if pin is high-z, proceed only if it is
				let net_i = this.component_pin_to_net_lookup[component_i][pin_i];
				if(net_i == null) {
					//throw new Error(`High-Z pin #${pin_i} of component #${component_i} is not connected to a net`);
					input_states.push(null);
					continue;
				}
				let state: [state: boolean, valid: boolean];
				if(net_i in computed_nets_dict) {// Cache hit
					state = computed_nets_dict[net_i];
				}
				else {// Cache miss
					state = this.get_net_state(net_i);
					computed_nets_dict[net_i] = state;
				}
				if(state[1]) {
					input_states.push(state[0]);
				}
				else {
					//throw new Error("Net state is either undefined or contested, simulation cannot be continued deterministically");
					input_states.push(null);
				}
			}
			component_input_states.push(input_states);
		}
		// External connection output states
		let ext_conn_output_states: Array<boolean | null> = [];// These have to correspond exactly to `this.external_connections`, some may be connected to undefined nets and are therefore marked `null`
		for(let ext_conn_i = 0; ext_conn_i < this.pins.length; ext_conn_i++) {
			let net_i = this.ext_conn_to_net_lookup[ext_conn_i];
			if(net_i == null) {
				//throw new Error(`Circuit output external connection #${ext_conn_i} is not connected to a net`);
				ext_conn_output_states.push(null);
				continue;
			}
			let state: [state: boolean, valid: boolean];
			if(net_i in computed_nets_dict) {// Cache hit
				state = computed_nets_dict[net_i];
			}
			else {// Cache miss
				state = this.get_net_state(net_i);
				computed_nets_dict[net_i] = state;
			}
			if(state[1]) {
				ext_conn_output_states.push(state[0]);
			}
			else {
				ext_conn_output_states.push(null);
			}
		}
		// use `.compute()` to update all component outputs
		let anything_changed: boolean = false;
		for(let component_i = 0; component_i < this.components.length; component_i++) {
			let component = this.components[component_i];
			let output_states: Array<[boolean, boolean]> = [];
			for(let i = 0; i < component.n_pins(); i++) {
				output_states.push(component.pin_state(i));
			}
			component.set_all_pin_states(component_input_states[component_i]);
			component.compute();
			for(let i = 0; i < component.n_pins(); i++) {
				//console.log(`lhs = ${output_states[i]}, rhs = ${component.pin_state(i)}`);
				if(output_states[i] != component.pin_state(i)) {// TODO: Fix
					anything_changed = true;
				}
			}
		}
		// Update external connections
		for(let ext_conn_i = 0; ext_conn_i < this.pins.length; ext_conn_i++) {
			let new_state = ext_conn_output_states[ext_conn_i];
			let pin = this.pins[ext_conn_i];
			if(new_state !== null) {
				if(pin.externally_driven) {
					if(pin.state != new_state) {
						throw new Error(`External connection #${ext_conn_i} ("${pin.name}") is contested`);
					}
				}
				else {// Only if pin is not externally driven, because Problem: an input connection will internally drive itself, causing a contention error when it is changed externally
					pin.state = new_state;
					pin.internally_driven = true;
				}
			}
			else {
				pin.internally_driven = false;
			}
		}
		return anything_changed;
	}
	get_net_state(net_i: number): [state: boolean, valid: boolean] {
		const net_component_conns: Array<[number, number]> = this.nets[net_i].component_connections;
		let state = false;
		let n_writers = 0;// To determine if floating, set, or contested
		// Component connections
		for(let i = 0; i < net_component_conns.length; i++) {
			let logic_pin_state: [boolean, boolean] = this.components[net_component_conns[i][0]].pin_state(net_component_conns[i][1]);
			if(!logic_pin_state[1]) {// Check if pin is working as an output
				n_writers += 1;
				if(n_writers > 1 && state != logic_pin_state[0]) {// Already another writer which is different, contention!
					return [state, false];
				}
				state = logic_pin_state[0];
			}
		}
		// External connections, only read ones that are externally driven
		const net_ext_conns: Array<number> = this.nets[net_i].external_connections;
		// External connections
		for(let i = 0; i < net_ext_conns.length; i++) {
			let ext_pin = this.pins[net_ext_conns[i]];
			if(ext_pin.externally_driven) {// Check if pin is working as an "output" (input to this circuit)
				n_writers += 1;
				if(n_writers > 1 && state != ext_pin.state) {// Already another writer which is different, contention!
					throw new Error(`External connection #${net_ext_conns[i]} ("${ext_pin.name}") on circuit "${this.unique_name}" is contested`);
				}
				state = ext_pin.state;
			}
		}
		if(n_writers == 0) {
			//this.logger.debug(`Net #${net_i} has undefined state`);
			return [false, false];
		}
		//this.logger.debug(`Net #${net_i} has state: ${state}`);
		return [state, true];
	}
	animate(t: number): Array<any> {
		let out: Array<any> = [];
		// Devices
		for(let component_i = 0; component_i < this.components.length; component_i++) {
			out = out.concat(this.components[component_i].animate(t));
		}
		// Nets
		for(let net_i = 0; net_i < this.nets.length; net_i++) {
			let wire_color = logic_wire_color(this.get_net_state(net_i));
			if(wire_color != this.nets[net_i].color()) {// Avoid useless tweens
				if(t > 0) {
					out.push(this.nets[net_i].color(wire_color, t));
				}
				else {
					this.nets[net_i].color(wire_color);
				}
			}
		}
		return out;
	}
	compute_and_animate_until_done(t: number, max_iter: number = 50): Array<any> {
		let out: Array<any> = [];
		let iter: number = 0;
		while(iter < max_iter) {
			let compute_done = !this.compute_private();
			out.push(delay(iter*t, all(...this.animate(t))));
			//out.push(waitFor(t*iter).next(this.grid_size(20, t/2).to(DEFAULT, t/2)));
			//out.push(this.grid_size(20, t/2).to(DEFAULT, t/2));
			//yield* this.grid_size(20, t/2).to(DEFAULT, t/2);
			//out = out.concat(this.animate(t));
			iter++;
			if(compute_done) {
				break;
			}
		}
		return out;
	}
	pin_state(n: number): [state: boolean, high_z: boolean] {
		let pin = this.pins[n];
		return [pin.state, !pin.internally_driven];
	}
	animate_highlight_components(components: Array<string>, t: number, color: Color) {
		let tweens: Array<any> = [];
		for(let i = 0; i < components.length; i++) {
			tweens.push(this.components[this.component_name_lookup[components[i]]].border_stroke(color, t));
		}
		return tweens;
	}
}

export class LogicCircuitToplevelWrapper {
	circuit: LogicCircuit;
	graphic_bits: Array<LogicSingleIO>;
	rect_ref: Reference<Rect>;
	position_grid: SimpleSignal<Vector2> | (() => Vector2);
	constructor(circuit: LogicCircuit, position_grid: SimpleSignal<Vector2> | (() => Vector2) = createSignal(new Vector2(0, 0))) {
		this.circuit = circuit;
		this.position_grid = position_grid;
		this.rect_ref = createRef<Rect>();
		// Create inputs and outputs and assign signals
		this.create_graphic_bits();
	}
	create_graphic_bits(): void {
		this.graphic_bits = [];
		for(let i = 0; i < this.circuit.pins.length; i++) {
			let conn = this.circuit.pins[i];
			this.graphic_bits.push(new LogicSingleIO(conn));
		}
	}
	init_view(parent_rect: View2D | Rect): void {
		parent_rect.add(<Rect
			ref={this.rect_ref}
			position={() => this.position_grid().scale(this.circuit.grid_size())}
		/>);
		this.circuit.init_view(this.rect_ref());
		this.init_view_graphic_bits();
	}
	init_view_graphic_bits(): void {
		for(let i = 0; i < this.graphic_bits.length; i++) {
			this.graphic_bits[i].init_view(this.circuit.rect_ref(), this.circuit.grid_size);// Use circuit's rectangle because the pin's grid position is relative to the circuit
		}
	}
	set_pin_state(pin_ref: number | string, state: boolean | null): void {
		this.circuit.set_pin_state(pin_ref, state);
	}
	compute_and_animate_until_done(t: number, max_iter: number = 50): Array<any> {
		// TODO: update graphic bits
		return this.circuit.compute_and_animate_until_done(t, max_iter);
	}
	remove() {
		this.rect_ref().remove();
		/*for(let i = 0; i < this.graphic_bits.length; i++) {
			this.graphic_bits[i].rect_ref().remove();
		}
		for(let i = 0; i < this.circuit.external_connections.length; i++) {
			this.circuit.external_connections[i][0].line_ref().remove();
		}*/
	}
	animate_changes(changes: Array<[pin_ref: number | string, state: boolean | null]>, t_step: number, max_cycles: number) {
		/* This block of code:

		d_latch.set_pin_state("CLK", false);
		yield* all(...d_latch.compute_and_animate_until_done(0.1, 5));

		Becomes:

		yield* all(...d_latch.animate_changes([["CLK", false]], 0.1, 5));
		*/
		for(let i = 0; i < changes.length; i++) {
			this.set_pin_state(...changes[i]);
		}
		return this.compute_and_animate_until_done(t_step, max_cycles);
	}
	animate_swap_in_new_circuit(parent_rect: View2D | Rect, new_circuit: LogicCircuit, t: number) {
		// `new_circuit` must have a position of 0
		// All external connection names have to match perfectly
		let tweens: Array<any> = [];
		// Save new circuit's grid size
		let new_circuit_og_grid_size: number = new_circuit.grid_size();
		new_circuit.grid_size(this.circuit.grid_size());
		tweens.push(new_circuit.grid_size(new_circuit_og_grid_size, t));
		// Old circuit fade out
		tweens.push(this.circuit.rect_ref().opacity(0, t));
		// New circuit fade in
		new_circuit.init_view(this.rect_ref());
		new_circuit.rect_ref().opacity(0);
		tweens.push(new_circuit.rect_ref().opacity(1, t));
		// Logic I/O pins moving to new layout, assign them to something other than the old circuit's rect so they don't fade out
		for(let i = 0; i < this.graphic_bits.length; i++) {
			let pin = this.graphic_bits[i];
			pin.rect_ref().remove();
			let old_abs_position = pin.pin.relative_start_grid().add(this.circuit.position_grid());
			let old_state = pin.pin.state;
			let old_ext_driven = pin.pin.externally_driven;
			// Reassign pin, make sure to look up name in `new_circuit` because pin indices may not match
			pin.pin = new_circuit.query_pin(pin.pin.name);
			pin.pin.state = old_state;
			pin.pin.externally_driven = old_ext_driven;
			let new_final_position_rel_this_rect = pin.pin.relative_start_grid();
			let new_final_rel_position = new_final_position_rel_this_rect.sub(new_circuit.position_grid());
			pin.pin.relative_start_grid(old_abs_position);
			tweens.push(pin.pin.relative_start_grid(new_final_rel_position.add(new_circuit.position_grid()), t));
			pin.init_view(this.rect_ref(), new_circuit.grid_size);
			// When the animation is done, transfer the pin to the circuit's rect so it can be correctly removed with the circuit
			tweens.push(delay(t, () => {
				pin.pin.line_ref().remove();
				pin.rect_ref().remove();
				pin.pin.relative_start_grid(new_final_rel_position);
				pin.init_view(new_circuit.rect_ref(), new_circuit.grid_size);
			}));
		}
		// problem: A graphic bit relies on its underlying pin for relative position. If the underlying pin is displayed under a seperate node than the graphic bit then they will not lign up. This will happen if the new circuit's position is not (0,0) while the graphic bit is displayed under this rect_ref, not that of the new circuit
		// Solution: Set the new_circuit's relative position to (0,0) and animate this.rect_ref().position and then set it back afterwards
		let new_circuit_og_position = new_circuit.position_grid().scale(new_circuit_og_grid_size);
		new_circuit.position_grid(new Vector2(0,0));
		let this_rect_og_position = this.rect_ref().position();
		tweens.push(this.rect_ref().position(new_circuit_og_position, t));
		// When animation is done, set this.rect_ref().position back to the original
		tweens.push(delay(t, () => {
			//new_circuit.position_grid(new_circuit_og_position);
			this.rect_ref().position(this_rect_og_position);
		}));
		// Assign new circuit
		this.circuit = new_circuit;
		// Propagate & set states correctly
		this.circuit.compute();
		this.circuit.animate(0);
		return tweens;
	}
	animate_form_part_of_larger_circuit(larger_circuit: LogicCircuit, component_to_replace: string, t: number) {
		// The larger circuit's position and grid size doesn't have to line up with `this.circuit`, this function will make it initially line up then animate it moving back to its original position and scale
		// Clear graphic bits
		for(let i = 0; i < this.graphic_bits.length; i++) {
			let pin = this.graphic_bits[i];
			pin.rect_ref().remove();// Keep the underlying pin's line ref because its part of the component
		}
		// Clear component's rect
		let component_i: number;
		let component_i_possible_undef = larger_circuit.component_name_lookup[component_to_replace];
		if(component_i_possible_undef !== undefined) {
			component_i = component_i_possible_undef;
		}
		else {
			throw new Error(`Call to animate_form_part_of_larger_circuit references component "${component_to_replace}", which does not exist`);
		}
		let current_grid_size = this.circuit.grid_size();
		this.circuit.grid_size = larger_circuit.grid_size;
		// If this circuit was previously displayed, remove it
		if(this.circuit.rect_ref() !== undefined) {
			this.circuit.rect_ref().remove();
			this.circuit.rect_ref = createRef<Rect>();
		}
		// If larger circuit hasn't been displayed, add it
		if(larger_circuit.rect_ref() === undefined) {
			larger_circuit.init_view(this.rect_ref());
		}
		this.circuit.init_view(larger_circuit.rect_ref());
		// Save new circuit's position and grid size
		let old_grid_size: number = larger_circuit.grid_size();
		let old_position: Vector2 = larger_circuit.position_grid();
		// Set new circuit so that its position and grid size lines up with original sub-circuit
		larger_circuit.grid_size(current_grid_size);
		larger_circuit.position_grid(larger_circuit.components[component_i].position_grid().scale(-1));
		// Reassign things
		this.circuit.position_grid(larger_circuit.components[component_i].position_grid);
		larger_circuit.components[component_i].rect_ref().remove();
		larger_circuit.components[component_i] = this.circuit;
		this.circuit = larger_circuit;
		this.circuit.assign_pin_signals_from_net_signals();
		this.create_graphic_bits();
		this.init_view_graphic_bits();// Must happen after `this.circuit` is reassigned
		// Propagate & set states correctly
		this.circuit.compute();
		this.circuit.animate(0);
		// Animate
		let tweens: Array<any> = [];
		tweens.push(this.circuit.grid_size(old_grid_size, t));
		tweens.push(this.circuit.position_grid(old_position, t));
		return tweens;
	}
	animate_highlight_components(components: Array<string>, t: number = 0.2, color: Color = new Color('#F00')) {
		let tweens: Array<any> = [];
		for(let i = 0; i < components.length; i++) {
			tweens.push(this.circuit.components[this.circuit.component_name_lookup[components[i]]].border_stroke(color, t));
		}
		return tweens;
	}
}

export class GraphicWire {
	start: Vector2;
	steps: Array<Vector2>;
	thickness: number;
	constructor(
		l: [Vector2, Array<[number, number]>],
		thickness: number
	) {
		this.thickness = thickness;
		this.start = l[0];
		this.steps = [];
		for(let conn_i = 0; conn_i < l[1].length; conn_i++) {
			this.steps.push(new Vector2(...l[1][conn_i]));
		}
	}
	init_view(view: View2D | Rect, color_signal: SimpleSignal<Color>, grid_size: SimpleSignal<number>) {
		let points_grid: Array<Vector2> = [this.start];
		for(let seg_i = 0; seg_i < this.steps.length; seg_i++) {
			let displacement_grid = this.steps[seg_i];
			let total_displacement = displacement_grid.add(points_grid[seg_i]);
			points_grid.push(total_displacement);
		}
		view.add(<Line
			stroke={color_signal}
			lineWidth={2}
			points={() => points_grid.map((grid_pos) => grid_pos.scale(grid_size()))}
		/>);
	}
}

export class LogicNet {
	// Color signal for animation
	color: SimpleSignal<Color>;
	// list pairs of [component index, component pin]
	component_connections: Array<[number, number]>;
	// For external connection pins
	external_connections: Array<number>;
	// Graphical connections (does not affect simulation)
	// Each wire has a starting position, then a list of displacement vectors (in grid space) that are chained together
	wires: Array<GraphicWire>;
	connection_dots: Array<Vector2>;
	constructor(component_connections: Array<[number, number]>, external_connections: Array<number>, wires: Array<[Vector2, Array<[number, number]>]>, connection_dots: Array<Vector2> | null) {
		this.color = createSignal(logic_wire_color([false, true]));
		this.component_connections = component_connections;
		this.external_connections = external_connections;
		this.wires = [];
		if(connection_dots === null) {
			this.component_connections = [];
		}
		else {
			this.connection_dots = connection_dots;
		}
		for(let i = 0; i < wires.length; i++) {
			this.wires.push(new GraphicWire(wires[i], 2));
		}
	}
}

export class GraphicBus {
	static wire_thickness: number = 3;
	// Each wire has a starting position, then a list of displacement vectors (in grid space) that are chained together
	wires: Array<GraphicWire>;
	fanouts: Array<[starting_pos: Vector2, direction: string, spacing: number, turn_left: boolean]>;
	color_signal: SimpleSignal<Color>;
	bit_width: number;
	constructor(
		bit_width: number,
		wires: Array<[Vector2, Array<[number, number]>]>,
		fanouts: Array<[starting_pos: Vector2, direction: string, spacing: number, turn_left: boolean]>
	) {
		this.bit_width = bit_width;
		this.wires = [];
		for(let i = 0; i < wires.length; i++) {
			this.wires.push(new GraphicWire(wires[i], GraphicBus.wire_thickness));
		}
		this.fanouts = fanouts;
		this.color_signal = createSignal(new Color('#00F'));
	}
	init_view(view: View2D | Rect, grid_size: SimpleSignal<number>) {
		// Wires
		for(let wire_i = 0; wire_i < this.wires.length; wire_i++) {
			this.wires[wire_i].init_view(view, this.color_signal, grid_size);
		}
		// Fanouts
		for(let fan_i = 0; fan_i < this.fanouts.length; fan_i++) {
			let [starting_pos, direction, spacing, turn_left] = this.fanouts[fan_i];
			let base_line_len = 2 + (this.bit_width - 1)*spacing;
			let direction_unit = direction_to_unit_vec(direction);
			let direction_bevel = direction_and_rel_turn_to_unit_vec(direction, turn_left);
			let end = starting_pos.add(direction_unit.scale(base_line_len));
			view.add(<Line
				points={[
					() => starting_pos.scale(grid_size()),
					() => end.scale(grid_size())
				]}
				stroke={this.color_signal}
				lineWidth={GraphicBus.wire_thickness}
			/>);
			for(let i = 0; i < this.bit_width; i++) {
				let start = starting_pos.add(direction_unit.scale(2 + i*this.bit_width));
				view.add(<Line
					points={[
						() => start.scale(grid_size()),
						() => start.add(direction_bevel).scale(grid_size())
					]}
					stroke={this.color_signal}
					lineWidth={GraphicBus.wire_thickness}
				/>);
			}
		}
	}
}

export class LogicConnectionPin {
	state_logic: boolean;
	state_for_animations: SimpleSignal<boolean>;
	internally_driven: boolean;
	externally_driven: boolean;
	color: SimpleSignal<Color>;
	relative_start_grid: SimpleSignal<Vector2>;
	direction: string;
	length: number;
	name: string;
	line_ref: Reference<Line>;
	constructor(relative_start_grid: Vector2 | SimpleSignal<Vector2>, direction: string, name: string, length: number = 1) {
		this.state_for_animations = createSignal(false);
		this.state = false;
		this.internally_driven = false;
		this.externally_driven = false;
		this.color = createSignal(logic_wire_color([false, true]));
		if(relative_start_grid instanceof Vector2) {
			this.relative_start_grid = createSignal(relative_start_grid);
		}
		else {
			this.relative_start_grid = relative_start_grid;
		}
		this.direction = direction;
		this.name = name;
		this.length = length;
		this.line_ref = createRef<Line>();
	}
	init_view(parent_rect: Rect, grid_size: SimpleSignal<number>) {
		parent_rect.add(
			<Line
				ref={this.line_ref}
				stroke={this.color}
				points={[
					() => this.relative_start_grid().scale(grid_size()),
					() => this.relative_start_grid().add(direction_to_unit_vec(this.direction).scale(this.length)).scale(grid_size())
				]}
				lineWidth={2}
			/>
		)
	}
	set state(state: boolean) {
		this.state_logic = state;
		this.state_for_animations(state);
	}
	get state(): boolean {
		return this.state_logic;
	}
}

// Only 1 bit, may also make more general class
// JUST FOR GRAPHICAL PURPOSES, NOT USED FOR SIMULATION OR INTERACTING W/ THE SIMULATION
export class LogicSingleIO {
	rect_ref: Reference<Rect>;
	pin: LogicConnectionPin;
	static half_extent: number = 0.5;
	constructor(pin: LogicConnectionPin) {
		this.rect_ref = createRef<Rect>();
		this.pin = pin;
	}
	init_view(parent_rect: Rect, grid_size: SimpleSignal<number>) {
		let points_centered = [
			new Vector2(-LogicSingleIO.half_extent, -LogicSingleIO.half_extent),
			new Vector2(LogicSingleIO.half_extent, -LogicSingleIO.half_extent),
			new Vector2(LogicSingleIO.half_extent, LogicSingleIO.half_extent),
			new Vector2(-LogicSingleIO.half_extent, LogicSingleIO.half_extent),
			new Vector2(-LogicSingleIO.half_extent, -LogicSingleIO.half_extent)
		];
		let text_rotation: number;
		if(this.pin.name.length > 2) {
			switch(this.pin.direction.toLowerCase()) {
				case 'n':
					text_rotation = 90;
					break;
				case 's':
					text_rotation = 90;
					break;
				default:
					text_rotation = 0;
					break;
			}
		}
		else {
			text_rotation = 0;
		}
		// Adjust them by the direction of the pin
		let points = [];
		for(let i = 0; i < points_centered.length; i++) {
			points.push(() => points_centered[i].add(direction_to_unit_vec(this.pin.direction).scale(1+LogicSingleIO.half_extent)).scale(grid_size()));
		}
		parent_rect.add(<Rect
			ref={this.rect_ref}
			width={() => grid_size() * 3}
			height={() => grid_size() * 2}
			position={() => this.pin.relative_start_grid().scale(grid_size())}
		>
			<Line
				points={points}
				stroke={this.pin.color}
				lineWidth={2}
			/>
			<Txt text={() => this.pin.state_for_animations() ? "1" : "0"} fill={"FFF"} position={() => direction_to_unit_vec(this.pin.direction).scale(grid_size()*1.5)} fontSize={() => grid_size()*FONT_GRID_SIZE_SCALE*0.7} />
			<Txt
				text={this.pin.name}
				fill={"#FFF"}
				stroke={"FFF"}
				position={() => direction_to_unit_vec(this.pin.direction).scale(grid_size()*3)}
				fontSize={() => grid_size()*FONT_GRID_SIZE_SCALE*0.7}
				rotation={text_rotation}
			/>
		</Rect>);
		//this.pin.init_view(parent_rect, grid_size);
	}
	set_state(state: boolean) {
		this.pin.state = state;
	}
}

export class GateAnd extends LogicDevice {
	constructor(position: SimpleSignal<Vector2> | (() => Vector2), unique_name: string | null = null, orientation: string = 'w') {
		super(
			[
				new LogicConnectionPin(new Vector2(-2, -1), 'w', 'a'),
				new LogicConnectionPin(new Vector2(-2, 1), 'w', 'b'),
				new LogicConnectionPin(new Vector2(2, 0), 'e', 'q')
			],
			position,
			unique_name,
			1,
			orientation
		);
		this.pins[0].internally_driven = false;
		this.pins[1].internally_driven = false;
		this.pins[2].internally_driven = true;
	}
	init_view(parent_rect: Rect, grid_size: SimpleSignal<number>) {
		parent_rect.add(<Rect
			ref={this.rect_ref}
			width={() => grid_size() * 8}
			height={() => grid_size() * 4}
			position={() => this.position_px(grid_size)}
			rotation={this.rotation}
		>
			<Line
				points={[
					() => new Vector2(0, -2).scale(grid_size()),
					() => new Vector2(-2, -2).scale(grid_size()),
					() => new Vector2(-2, 2).scale(grid_size()),
					() => new Vector2(0, 2).scale(grid_size())
				]}
				stroke={this.border_stroke}
				lineWidth={2}
			/>
			<Circle
				width={() => grid_size() * 4}
				height={() => grid_size() * 4}
				position={new Vector2(0, 0)}
				stroke={this.border_stroke}
				lineWidth={2}
				startAngle={-90}
				endAngle={90}
			/>
			<Txt fill={"FFF"} position={() => new Vector2(-grid_size()*0.3, 0)} fontSize={() => grid_size()*FONT_GRID_SIZE_SCALE}>AND</Txt>
		</Rect>);
		this.init_view_pins(grid_size);
	}
	compute_private() {
		this.pins[2].state = this.pins[0].state && this.pins[1].state;
	}
}

export class GateOr extends LogicDevice {
	constructor(position: SimpleSignal<Vector2> | (() => Vector2), unique_name: string | null = null, orientation: string = 'w') {
		super(
			[
				new LogicConnectionPin(new Vector2(-2, -1), 'w', 'a'),
				new LogicConnectionPin(new Vector2(-2, 1), 'w', 'b'),
				new LogicConnectionPin(new Vector2(2, 0), 'e', 'q')
			],
			position,
			unique_name,
			1,
			orientation
		);
		this.pins[0].internally_driven = false;
		this.pins[1].internally_driven = false;
		this.pins[2].internally_driven = true;
	}
	init_view(parent_rect: Rect, grid_size: SimpleSignal<number>) {
		parent_rect.add(<Rect
			ref={this.rect_ref}
			width={() => grid_size() * 8}
			height={() => grid_size() * 4}
			position={() => this.position_px(grid_size)}
			rotation={this.rotation}
		>
			<Line
				points={[
					() => new Vector2(-1.5, -2).scale(grid_size()),
					() => new Vector2(-2.1, -2).scale(grid_size())
				]}
				stroke={this.border_stroke}
				lineWidth={2}
			/>
			<Line
				points={[
					() => new Vector2(-1.5, 2).scale(grid_size()),
					() => new Vector2(-2.1, 2).scale(grid_size())
				]}
				stroke={this.border_stroke}
				lineWidth={2}
			/>
			<Circle
				width={() => grid_size() * 8}
				height={() => grid_size() * 8}
				position={() => new Vector2(-1.5, 2).scale(grid_size())}
				stroke={this.border_stroke}
				lineWidth={2}
				startAngle={-90}
				endAngle={-30}
			/>
			<Circle
				width={() => grid_size() * 8}
				height={() => grid_size() * 8}
				position={() => new Vector2(-1.5, -2).scale(grid_size())}
				stroke={this.border_stroke}
				lineWidth={2}
				startAngle={30}
				endAngle={90}
			/>
			<Circle
				width={() => grid_size() * 12}
				height={() => grid_size() * 12}
				position={() => new Vector2(-7.8, 0).scale(grid_size())}
				stroke={this.border_stroke}
				lineWidth={2}
				startAngle={-19.5}
				endAngle={19.5}
			/>
			<Txt fill={"FFF"} position={() => new Vector2(-grid_size()*0.3, 0)} fontSize={() => grid_size()*FONT_GRID_SIZE_SCALE}>OR</Txt>
		</Rect>);
		this.init_view_pins(grid_size);
	}
	compute_private() {
		this.pins[2].state = this.pins[0].state || this.pins[1].state;
	}
}

export class GateXor extends LogicDevice {
	constructor(position: SimpleSignal<Vector2> | (() => Vector2), unique_name: string | null = null, orientation: string = 'w') {
		super(
			[
				new LogicConnectionPin(new Vector2(-2.3, -1), 'w', 'a', 0.7),
				new LogicConnectionPin(new Vector2(-2.3, 1), 'w', 'b', 0.7),
				new LogicConnectionPin(new Vector2(2, 0), 'e', 'q')
			],
			position,
			unique_name,
			1,
			orientation
		);
		this.pins[0].internally_driven = false;
		this.pins[1].internally_driven = false;
		this.pins[2].internally_driven = true;
	}
	init_view(parent_rect: Rect, grid_size: SimpleSignal<number>) {
		parent_rect.add(<Rect
			ref={this.rect_ref}
			width={() => grid_size() * 8}
			height={() => grid_size() * 4}
			position={() => this.position_px(grid_size)}
			rotation={this.rotation}
		>
			<Line
				points={[
					() => new Vector2(-1.5, -2).scale(grid_size()),
					() => new Vector2(-2.1, -2).scale(grid_size())
				]}
				stroke={this.border_stroke}
				lineWidth={2}
			/>
			<Line
				points={[
					() => new Vector2(-1.5, 2).scale(grid_size()),
					() => new Vector2(-2.1, 2).scale(grid_size())
				]}
				stroke={this.border_stroke}
				lineWidth={2}
			/>
			<Circle
				width={() => grid_size() * 8}
				height={() => grid_size() * 8}
				position={() => new Vector2(-1.5, 2).scale(grid_size())}
				stroke={this.border_stroke}
				lineWidth={2}
				startAngle={-90}
				endAngle={-30}
			/>
			<Circle
				width={() => grid_size() * 8}
				height={() => grid_size() * 8}
				position={() => new Vector2(-1.5, -2).scale(grid_size())}
				stroke={this.border_stroke}
				lineWidth={2}
				startAngle={30}
				endAngle={90}
			/>
			<Circle
				width={() => grid_size() * 12}
				height={() => grid_size() * 12}
				position={() => new Vector2(-7.8, 0).scale(grid_size())}
				stroke={this.border_stroke}
				lineWidth={2}
				startAngle={-19.5}
				endAngle={19.5}
			/>
			<Circle
				width={() => grid_size() * 12}
				height={() => grid_size() * 12}
				position={() => new Vector2(-8.1, 0).scale(grid_size())}
				stroke={this.border_stroke}
				lineWidth={2}
				startAngle={-19.5}
				endAngle={19.5}
			/>
			<Txt fill={"FFF"} position={() => new Vector2(-grid_size()*0.3, 0)} fontSize={() => grid_size()*FONT_GRID_SIZE_SCALE}>XOR</Txt>
		</Rect>);
		this.init_view_pins(grid_size);
	}
	compute_private() {
		this.pins[2].state = this.pins[0].state != this.pins[1].state;
	}
}

export class GateNand extends LogicDevice {
	constructor(position: SimpleSignal<Vector2> | (() => Vector2), unique_name: string | null = null, orientation: string = 'w') {
		super(
			[
				new LogicConnectionPin(new Vector2(-2, -1), 'w', 'a'),
				new LogicConnectionPin(new Vector2(-2, 1), 'w', 'b'),
				new LogicConnectionPin(new Vector2(3, 0), 'e', 'q')
			],
			position,
			unique_name,
			1,
			orientation
		);
		this.pins[0].internally_driven = false;
		this.pins[1].internally_driven = false;
		this.pins[2].internally_driven = true;
	}
	init_view(parent_rect: Rect, grid_size: SimpleSignal<number>) {
		parent_rect.add(<Rect
			ref={this.rect_ref}
			width={() => grid_size() * 8}
			height={() => grid_size() * 4}
			position={() => this.position_px(grid_size)}
			rotation={this.rotation}
		>
			<Line
				points={[
					() => new Vector2(0, -2).scale(grid_size()),
					() => new Vector2(-2, -2).scale(grid_size()),
					() => new Vector2(-2, 2).scale(grid_size()),
					() => new Vector2(0, 2).scale(grid_size())
				]}
				stroke={this.border_stroke}
				lineWidth={2}
			/>
			<Circle
				width={() => grid_size() * 4}
				height={() => grid_size() * 4}
				position={new Vector2(0, 0)}
				stroke={this.border_stroke}
				lineWidth={2}
				startAngle={-90}
				endAngle={90}
			/>
			<Circle
				width={grid_size}
				height={grid_size}
				position={() => new Vector2(2.5, 0).scale(grid_size())}
				stroke={this.border_stroke}
				lineWidth={2}
			/>
			<Txt fill={"FFF"} position={() => new Vector2(0, 0)} fontSize={() => grid_size()*FONT_GRID_SIZE_SCALE}>NAND</Txt>
		</Rect>);
		this.init_view_pins(grid_size);
	}
	compute_private() {
		this.pins[0].state = !(this.pins[0].state && this.pins[1].state);
	}
}

export class GateNor extends LogicDevice {
	constructor(position: SimpleSignal<Vector2> | (() => Vector2), unique_name: string | null = null, orientation: string = 'w') {
		super(
			[
				new LogicConnectionPin(new Vector2(-2, -1), 'w', 'a'),
				new LogicConnectionPin(new Vector2(-2, 1), 'w', 'b'),
				new LogicConnectionPin(new Vector2(3, 0), 'e', 'q')
			],
			position,
			unique_name,
			1,
			orientation
		);
		this.pins[0].internally_driven = false;
		this.pins[1].internally_driven = false;
		this.pins[2].internally_driven = true;
	}
	init_view(parent_rect: Rect, grid_size: SimpleSignal<number>) {
		parent_rect.add(<Rect
			ref={this.rect_ref}
			width={() => grid_size() * 8}
			height={() => grid_size() * 4}
			position={() => this.position_px(grid_size)}
			rotation={this.rotation}
		>
			<Line
				points={[
					() => new Vector2(-1.5, -2).scale(grid_size()),
					() => new Vector2(-2.1, -2).scale(grid_size())
				]}
				stroke={this.border_stroke}
				lineWidth={2}
			/>
			<Line
				points={[
					() => new Vector2(-1.5, 2).scale(grid_size()),
					() => new Vector2(-2.1, 2).scale(grid_size())
				]}
				stroke={this.border_stroke}
				lineWidth={2}
			/>
			<Circle
				width={() => grid_size() * 8}
				height={() => grid_size() * 8}
				position={() => new Vector2(-1.5, 2).scale(grid_size())}
				stroke={this.border_stroke}
				lineWidth={2}
				startAngle={-90}
				endAngle={-30}
			/>
			<Circle
				width={() => grid_size() * 8}
				height={() => grid_size() * 8}
				position={() => new Vector2(-1.5, -2).scale(grid_size())}
				stroke={this.border_stroke}
				lineWidth={2}
				startAngle={30}
				endAngle={90}
			/>
			<Circle
				width={() => grid_size() * 12}
				height={() => grid_size() * 12}
				position={() => new Vector2(-7.8, 0).scale(grid_size())}
				stroke={this.border_stroke}
				lineWidth={2}
				startAngle={-19.5}
				endAngle={19.5}
			/>
			<Circle
				width={grid_size}
				height={grid_size}
				position={() => new Vector2(2.5, 0).scale(grid_size())}
				stroke={this.border_stroke}
				lineWidth={2}
			/>
			<Txt fill={"FFF"} position={() => new Vector2(-grid_size()*0.3, 0)} fontSize={() => grid_size()*FONT_GRID_SIZE_SCALE}>NOR</Txt>
		</Rect>);
		this.init_view_pins(grid_size);
	}
	compute_private() {
		this.pins[2].state = !(this.pins[0].state || this.pins[1].state);
	}
}

export class GateXnor extends LogicDevice {
	constructor(position: SimpleSignal<Vector2> | (() => Vector2), unique_name: string | null = null, orientation: string = 'w') {
		super(
			[
				new LogicConnectionPin(new Vector2(-2.3, -1), 'w', 'a', 0.7),
				new LogicConnectionPin(new Vector2(-2.3, 1), 'w', 'b', 0.7),
				new LogicConnectionPin(new Vector2(3, 0), 'e', 'q')
			],
			position,
			unique_name,
			1,
			orientation
		);
		this.pins[0].internally_driven = false;
		this.pins[1].internally_driven = false;
		this.pins[2].internally_driven = true;
	}
	init_view(parent_rect: Rect, grid_size: SimpleSignal<number>) {
		parent_rect.add(<Rect
			ref={this.rect_ref}
			width={() => grid_size() * 8}
			height={() => grid_size() * 4}
			position={() => this.position_px(grid_size)}
			rotation={this.rotation}
		>
			<Line
				points={[
					() => new Vector2(-1.5, -2).scale(grid_size()),
					() => new Vector2(-2.1, -2).scale(grid_size())
				]}
				stroke={this.border_stroke}
				lineWidth={2}
			/>
			<Line
				points={[
					() => new Vector2(-1.5, 2).scale(grid_size()),
					() => new Vector2(-2.1, 2).scale(grid_size())
				]}
				stroke={this.border_stroke}
				lineWidth={2}
			/>
			<Circle
				width={() => grid_size() * 8}
				height={() => grid_size() * 8}
				position={() => new Vector2(-1.5, 2).scale(grid_size())}
				stroke={this.border_stroke}
				lineWidth={2}
				startAngle={-90}
				endAngle={-30}
			/>
			<Circle
				width={() => grid_size() * 8}
				height={() => grid_size() * 8}
				position={() => new Vector2(-1.5, -2).scale(grid_size())}
				stroke={this.border_stroke}
				lineWidth={2}
				startAngle={30}
				endAngle={90}
			/>
			<Circle
				width={() => grid_size() * 12}
				height={() => grid_size() * 12}
				position={() => new Vector2(-7.8, 0).scale(grid_size())}
				stroke={this.border_stroke}
				lineWidth={2}
				startAngle={-19.5}
				endAngle={19.5}
			/>
			<Circle
				width={() => grid_size() * 12}
				height={() => grid_size() * 12}
				position={() => new Vector2(-8.1, 0).scale(grid_size())}
				stroke={this.border_stroke}
				lineWidth={2}
				startAngle={-19.5}
				endAngle={19.5}
			/>
			<Circle
				width={grid_size}
				height={grid_size}
				position={() => new Vector2(2.5, 0).scale(grid_size())}
				stroke={this.border_stroke}
				lineWidth={2}
			/>
			<Txt fill={"FFF"} position={() => new Vector2(-grid_size()*0.1, 0)} fontSize={() => grid_size()*FONT_GRID_SIZE_SCALE}>XNOR</Txt>
		</Rect>);
		this.init_view_pins(grid_size);
	}
	compute_private() {
		this.pins[2].state = this.pins[0].state == this.pins[1].state;
	}
}

export class GateNot extends LogicDevice {
	constructor(position: SimpleSignal<Vector2> | (() => Vector2), unique_name: string | null = null, orientation: string = 'w') {
		super(
			[
				new LogicConnectionPin(new Vector2(-2, 0), 'w', 'a'),
				new LogicConnectionPin(new Vector2(3, 0), 'e', 'q')
			],
			position,
			unique_name,
			1,
			orientation
		);
		this.pins[0].internally_driven = false;
		this.pins[1].internally_driven = true;
	}
	init_view(parent_rect: Rect, grid_size: SimpleSignal<number>) {
		parent_rect.add(<Rect
			ref={this.rect_ref}
			width={() => grid_size() * 8}
			height={() => grid_size() * 4}
			position={() => this.position_px(grid_size)}
			rotation={this.rotation}
		>
			<Line
				points={[
					() => new Vector2(2, 0).scale(grid_size()),
					() => new Vector2(-2, -2).scale(grid_size()),
					() => new Vector2(-2, 2).scale(grid_size()),
					() => new Vector2(2, 0).scale(grid_size())
				]}
				stroke={this.border_stroke}
				lineWidth={2}
			/>
			<Circle
				width={grid_size}
				height={grid_size}
				position={() => new Vector2(2.5, 0).scale(grid_size())}
				stroke={this.border_stroke}
				lineWidth={2}
			/>
			<Txt fill={"FFF"} position={() => new Vector2(-grid_size()*0.5, 0)} fontSize={() => grid_size()*FONT_GRID_SIZE_SCALE}>NOT</Txt>
		</Rect>);
		this.init_view_pins(grid_size);
	}
	compute_private() {
		this.pins[1].state = !this.pins[0].state;
	}
}

export class TriBuffer extends LogicDevice {
	constructor(position: SimpleSignal<Vector2> | (() => Vector2), unique_name: string | null = null, orientation: string = 'w') {
		super(
			[
				new LogicConnectionPin(new Vector2(-2, 0), 'w', 'A'),
				new LogicConnectionPin(new Vector2(2, 0), 'e', 'Q'),
				new LogicConnectionPin(new Vector2(0, -1), 'n', 'OE')
			],
			position,
			unique_name,
			1,
			orientation
		);
		this.pins[0].internally_driven = false;
		this.pins[1].internally_driven = false;
		this.pins[2].internally_driven = false;
	}
	init_view(parent_rect: Rect, grid_size: SimpleSignal<number>) {
		parent_rect.add(<Rect
			ref={this.rect_ref}
			width={() => grid_size() * 8}
			height={() => grid_size() * 4}
			position={() => this.position_px(grid_size)}
			rotation={this.rotation}
		>
			<Line
				points={[
					() => new Vector2(2, 0).scale(grid_size()),
					() => new Vector2(-2, -2).scale(grid_size()),
					() => new Vector2(-2, 2).scale(grid_size()),
					() => new Vector2(2, 0).scale(grid_size())
				]}
				stroke={this.border_stroke}
				lineWidth={2}
			/>
			<Txt fill={"FFF"} position={() => new Vector2(-grid_size()*0.5, 0)} fontSize={() => grid_size()*FONT_GRID_SIZE_SCALE}>TRI</Txt>
		</Rect>);
		this.init_view_pins(grid_size);
	}
	compute_private() {
		this.pins[1].internally_driven = this.pins[2].state;
		this.pins[1].state = this.pins[0].state;
	}
}