import {Circle, Layout, makeScene2D, Rect, View2D, Txt, Img, Code, vector2Signal, Line, CircleSegment} from '@motion-canvas/2d';
import {all, beginSlide, waitFor, createRef, Reference, Signal, SimpleSignal, createSignal, DEFAULT, Color, Vector2Signal, Vector2, SignalTween, SimpleVector2Signal, useLogger, easeInOutCubic, SignalGenerator, delay, Logger} from '@motion-canvas/core';

/* Logic simulation & animation usage
To create a simulation:
	The main simulation will be an instance of `LogicCircuitToplevelWrapper`. to instanciate one, pass an instance of `LogicCircuit`.
The `LogicCircuit` class contains most of the simulation logic, however it does extend the `LogicDevice` class meaning it can be nested inside another larger simulation.
To interact with the simulation:
	When creating a `LogicCircuit`, the parameter `external_connections` is used to define the inputs and outputs (or bidirectional, the high-impedence status can change)
	TODO: stuff that requires extending `LogicDevice`
*/

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

// Could be a simple gate, or something more complicated like an adder, or maybe even the whole computer
export abstract class LogicDevice {
	pins: Array<LogicConnectionPin>;
	rect_ref: Reference<Rect>;
	position_grid: SimpleSignal<Vector2>;
	border_stroke: SimpleSignal<Color>;
	unique_name: string | null;
	constructor(
		pin_locations: Array<[Vector2, Vector2]>,// [Position, Outgoing direction]
		position_grid: SimpleSignal<Vector2>,
		unique_name: string | null = null
	) {
		this.position_grid = position_grid;
		this.border_stroke = createSignal(new Color('#FFF'));
		this.unique_name = unique_name
		this.pins = [];
		this.rect_ref = createRef<Rect>();
		for(let i = 0; i < pin_locations.length; i++) {
			this.pins.push(new LogicConnectionPin(pin_locations[i][0], pin_locations[i][1]));
		}
		/*this.compute(Array(input_pin_locations.length).fill(false));
		this.animate(0);*/
	}
	abstract init_view(parent_rect: Rect, grid_size: SimpleSignal<number>): void;
	init_view_pins(grid_size: SimpleSignal<number>) {
		for(let i = 0; i < this.pins.length; i++) {
			this.pins[i].init_view(this.rect_ref(), grid_size);
		}
	}
	// Just updates input and output states, doesn't modify color signals
	abstract compute(): void;
	// Sets pin #pin_i with either a boolean value (externally driven) or with null (not ext driven)
	set_pin_state(pin_i: number, state: boolean | null): void {
		let pin = this.pins[pin_i];
		if(state != null) {
			if(pin.internally_driven && pin.state != state) {
				throw new Error(`LogicDevice pin #${pin_i} attempt to set contests with internally driven state`);
			}
			pin.state = state;
			pin.externally_driven = true;
		}
		else {
			pin.externally_driven = false;
		}
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
}

// TODO: extend LogicDevice, this gonna be fire once I get it working
export class LogicCircuit /*extends LogicDevice*/ {
	components: Array<LogicDevice>;
	external_connections: Array<[LogicConnectionPin, string]>;// pin, name. Very similar to `LogicDevice.pins`
	// List of nets, each net is a list pairs of [component index, component pin] and a color signal for animation
	nets: Array<LogicNet>;
	// Redundant w/ `nets`, just to improve performance, for component pins
	// List of (Lists of pins and corresponding net index) for each component, so `net_i = pin_to_net_lookup[component_i][pin_i]`
	// Possibly `null` if pin is unconnected
	component_pin_to_net_lookup: Array<Array<number | null>>;
	// Same as `component_pin_to_net_lookup` but for external connections
	// `net_i = ext_conn_to_net_lookup[ext_conn_i]`
	ext_conn_to_net_lookup: Array<number | null>;
	grid_size: SimpleSignal<number>;
	rect_ref: Reference<Rect>;
	position_grid: SimpleSignal<Vector2>;
	logger: Logger | Console;
	component_name_lookup: {[unique_name: string]: number};
	external_connections_name_lookup: {[unique_name: string]: number};
	constructor(
		components: Array<LogicDevice>,
		external_connections: Array<[LogicConnectionPin, string]>,// Pin, name
		nets: Array<[Array<[number | string, number] | string>, Array<[Vector2, Array<[number, number]>]>]>,// Components can be referenced by index or unique name, a connection `[number | string, number] | string` can be [component name | component index, pin i] | external connection name
		grid_size: SimpleSignal<number>,
		position_grid: SimpleSignal<Vector2>
	) {
		//super();
		this.components = components;
		this.external_connections = external_connections;
		this.grid_size = grid_size;
		this.position_grid = position_grid;
		this.logger = useLogger();
		// Find component names
		this.component_name_lookup = {};
		for(let component_i = 0; component_i < this.components.length; component_i++) {
			let component = this.components[component_i];
			if(component.unique_name != null) {
				// Check if name is repeated
				if(this.component_name_lookup[component.unique_name] != null) {
					throw new Error(`The component name "${component.unique_name}" is used at least twice`);
				}
				this.component_name_lookup[component.unique_name] = component_i;
			}
		}
		// Find external connection names
		this.external_connections_name_lookup = {};
		for(let conn_i = 0; conn_i < this.external_connections.length; conn_i++) {
			let conn = this.external_connections[conn_i];
			// Check if name is repeated
			if(this.external_connections_name_lookup[conn[1]] != null) {
				throw new Error(`The external connection name "${conn[1]}" is used at least twice`);
			}
			this.external_connections_name_lookup[conn[1]] = conn_i;
		}
		// Assign nets
		this.nets = [];
		for(let net_i = 0; net_i < nets.length; net_i++) {
			let net_component_connections: Array<[number, number]> = [];
			let net_external_connections: Array<number> = [];
			for(let conn_i = 0; conn_i < nets[net_i][0].length; conn_i++) {
				let connection_query: [number | string, number] | string = nets[net_i][0][conn_i];
				let component_i;
				if(typeof(connection_query) == "string") {// External connection name
					let ext_conn_i = this.external_connections_name_lookup[connection_query];
					if(ext_conn_i == null) {
						throw new Error(`Name for external connection "${connection_query}" on net #${net_i} does not exist`);
					}
					net_external_connections.push(ext_conn_i);
				}
				else {// Component, [component name | component index, pin i]
					let [component_query, pin_i] = connection_query;
					if(typeof(component_query) == "string") {// Component name, look it up
						let component_i_possible_undef = this.component_name_lookup[component_query];
						if(component_i_possible_undef !== undefined) {
							component_i = component_i_possible_undef;
						}
						else {
							throw new Error(`Net #${net_i} references component "${component_query}" as part of connection, which does not exist`);
						}
					}
					else {// The actual component index
						component_i = component_query
					}
					net_component_connections.push([component_i, pin_i]);
				}
			}
			this.nets.push(new LogicNet(net_component_connections, net_external_connections, nets[net_i][1]));
		}
		// Create pin to net lookup table and assign pin color signals from net color signals
		this.component_pin_to_net_lookup = [];
		this.ext_conn_to_net_lookup = [];
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
				if(n_nets_connected == 0) {
					component_pins_lookup.push(null);
				}
				else {
					if(n_nets_connected == 1) {
						component_pins_lookup.push(found_net_i);
						// Assign pin color signal
						this.components[component_i].pins[pin_i].color = this.nets[found_net_i].color;
					}
					else {
						throw new Error(`Pin #${pin_i} of component #${component_i} is connected to ${n_nets_connected} nets`);
					}
				}
			}
			this.component_pin_to_net_lookup.push(component_pins_lookup);
		}
		for(let ext_conn_i = 0; ext_conn_i < this.external_connections.length; ext_conn_i++) {
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
					this.external_connections[ext_conn_i][0].color = this.nets[found_net_i].color;
				}
				else {
					throw new Error(`External connection #${ext_conn_i} is connected to ${n_nets_connected} nets`);
				}
			}
		}
		this.rect_ref = createRef<Rect>();
	}
	init_view(view: View2D | Rect) {
		view.add(<Rect ref={this.rect_ref} position={() => this.position_grid().scale(this.grid_size())}/>);
		for(let i = 0; i < this.components.length; i++) {
			this.components[i].init_view(this.rect_ref(), this.grid_size);
		}
		// Wires
		for(let net_i = 0; net_i < this.nets.length; net_i++) {
			let net = this.nets[net_i];
			for(let wire_i = 0; wire_i < net.wires.length; wire_i++) {
				let starting_pos: Vector2 = net.wires[wire_i][0];
				let points_grid: Array<Vector2> = [starting_pos];
				for(let seg_i = 0; seg_i < net.wires[wire_i][1].length; seg_i++) {
					let displacement_grid = net.wires[wire_i][1][seg_i];
					let total_displacement = displacement_grid.add(points_grid[seg_i]);
					points_grid.push(total_displacement);
				}
				this.rect_ref().add(<Line
					stroke={net.color}
					lineWidth={2}
					points={() => points_grid.map((grid_pos) => grid_pos.scale(this.grid_size()))}
				/>);
			}
		}
	}
	get_pin_grid_position(component_i: number, pin_i: number) {
		let component = this.components[component_i];
		return component.position_grid().add(component.pins[pin_i].relative_start_grid.add(component.pins[pin_i].direction_grid));
	}
	// Returns whether simulation is stable (everything has propagated)
	// To run simulation completely, loop this function until it returns `false`
	// It may never return `false` (like of a NOT gat is connected to itself) so be sure to impose a limit to prevent infinite loops
	compute(): boolean {
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
					throw new Error(`High-Z pin #${pin_i} of component #${component_i} is not connected to a net`);
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
		for(let ext_conn_i = 0; ext_conn_i < this.external_connections.length; ext_conn_i++) {
			let net_i = this.ext_conn_to_net_lookup[ext_conn_i];
			if(net_i == null) {
				throw new Error(`Circuit output external connection #${ext_conn_i} is not connected to a net`);
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
		for(let ext_conn_i = 0; ext_conn_i < this.external_connections.length; ext_conn_i++) {
			let new_state = ext_conn_output_states[ext_conn_i];
			if(new_state !== null) {
				if(this.external_connections[ext_conn_i][0].externally_driven && this.external_connections[ext_conn_i][0].state != new_state) {
					throw new Error(`External connection #${ext_conn_i} ("${this.external_connections[ext_conn_i][1]}") is contested`);
				}
				this.external_connections[ext_conn_i][0].state = new_state;
				this.external_connections[ext_conn_i][0].internally_driven = true;
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
			let ext_pin = this.external_connections[net_ext_conns[i]][0];
			if(ext_pin.externally_driven) {// Check if pin is working as an "output" (input to this circuit)
				n_writers += 1;
				if(n_writers > 1 && state != ext_pin.state) {// Already another writer which is different, contention!
					throw new Error(`External connection #${net_ext_conns[i]} is contested`);
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
			let compute_done = !this.compute();
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
}

export class LogicCircuitToplevelWrapper {
	circuit: LogicCircuit;
	graphic_bits: Array<LogicSingleIO>;
	constructor(circuit: LogicCircuit) {
		this.circuit = circuit;
		// Create inputs and outputs and assign signals
		this.graphic_bits = [];
		for(let i = 0; i < circuit.external_connections.length; i++) {
			let conn = circuit.external_connections[i][0];
			this.graphic_bits.push(new LogicSingleIO(conn));
		}
	}
	init_view(parent_rect: View2D | Rect): void {
		this.circuit.init_view(parent_rect);
		for(let i = 0; i < this.graphic_bits.length; i++) {
			this.graphic_bits[i].init_view(parent_rect, this.circuit.grid_size);
		}
	}
	set_conn_state(name: string, state: boolean, driven: boolean = true): void {
		let pin = this.circuit.external_connections[this.circuit.external_connections_name_lookup[name]][0];
		if(driven) {
			pin.state = state;
			pin.externally_driven = true;
		}
		else {
			pin.externally_driven = false;
		}
	}
	compute_and_animate_until_done(t: number, max_iter: number = 50): Array<any> {
		return this.circuit.compute_and_animate_until_done(t, max_iter);
	}
	remove() {
		this.circuit.rect_ref().remove();
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
	wires: Array<[Vector2, Array<Vector2>]>;
	constructor(component_connections: Array<[number, number]>, external_connections: Array<number>, wires: Array<[Vector2, Array<[number, number]>]>) {
		this.color = createSignal(logic_wire_color([false, true]));
		this.component_connections = component_connections;
		this.external_connections = external_connections;
		this.wires = [];
		for(let i = 0; i < wires.length; i++) {
			let wire_connections = [];
			for(let conn_i = 0; conn_i < wires[i][1].length; conn_i++) {
				let [x, y] = wires[i][1][conn_i];
				wire_connections.push(new Vector2(x, y));
			}
			this.wires.push([wires[i][0], wire_connections]);
		}
	}
}

// Old one
/*export class LogicConnectionPin {
	state: boolean;
	high_z: boolean;
	color: SimpleSignal<Color>;
	relative_start_grid: Vector2;
	direction_grid: Vector2;
	line_ref: Reference<Line>;
	constructor(high_z: boolean, relative_start_grid: Vector2, direction_grid: Vector2) {
		this.state = false;
		this.high_z = high_z;
		this.color = createSignal(logic_wire_color([false, true]));
		this.relative_start_grid = relative_start_grid;
		this.direction_grid = direction_grid;
		this.line_ref = createRef<Line>();
	}
	init_view(parent_rect: Rect, grid_size: SimpleSignal<number>) {
		parent_rect.add(<Line
			stroke={this.color}
			points={[
				() => this.relative_start_grid.scale(grid_size()),
				() => this.relative_start_grid.add(this.direction_grid).scale(grid_size())
			]}
			lineWidth={2}
		/>)
	}
}*/

export class LogicConnectionPin {
	state: boolean;
	internally_driven: boolean;
	externally_driven: boolean;
	color: SimpleSignal<Color>;
	relative_start_grid: Vector2;
	direction_grid: Vector2;
	line_ref: Reference<Line>;
	constructor(relative_start_grid: Vector2, direction_grid: Vector2) {
		this.state = false;
		this.internally_driven = false;
		this.externally_driven = false;
		this.color = createSignal(logic_wire_color([false, true]));
		this.relative_start_grid = relative_start_grid;
		this.direction_grid = direction_grid;
		this.line_ref = createRef<Line>();
	}
	init_view(parent_rect: Rect, grid_size: SimpleSignal<number>) {
		parent_rect.add(<Line
			stroke={this.color}
			points={[
				() => this.relative_start_grid.scale(grid_size()),
				() => this.relative_start_grid.add(this.direction_grid).scale(grid_size())
			]}
			lineWidth={2}
		/>)
	}
}

// Only 1 bit, may also make more general class
// JUST FOR GRAPHICAL PURPOSES, NOT USED FOR SIMULATION OR INTERACTING W/ THE SIMULATION
export class LogicSingleIO {
	rect_ref: Reference<Rect>;
	state: SimpleSignal<boolean>;
	pin: LogicConnectionPin;// This is an input/high-z pin used by the LogicCircuit
	constructor(pin: LogicConnectionPin) {
		this.rect_ref = createRef<Rect>();
		this.pin = pin;
		this.state = createSignal(pin.state);
	}
	init_view(parent_rect: Rect, grid_size: SimpleSignal<number>) {
		let points_centered = [
			new Vector2(-1, -1),
			new Vector2(1, -1),
			new Vector2(1, 1),
			new Vector2(-1, 1),
			new Vector2(-1, -1)
		];
		// Adjust them by the direction of the pin
		let points = [];
		for(let i = 0; i < points_centered.length; i++) {
			points.push(() => points_centered[i].add(this.pin.direction_grid.scale(2)).scale(grid_size()));
		}
		parent_rect.add(<Rect
			ref={this.rect_ref}
			width={() => grid_size() * 3}
			height={() => grid_size() * 2}
			position={() => this.pin.relative_start_grid.scale(grid_size())}
		>
			<Line
				points={points}
				stroke={this.pin.color}
				lineWidth={2}
			/>
			<Txt text={() => this.state() ? "1" : "0"} fill={"FFF"} position={() => this.pin.direction_grid.scale(2).scale(grid_size())} fontSize={() => grid_size()*1.1} />
		</Rect>);
		this.pin.init_view(parent_rect, grid_size);
	}
	set_state(state: boolean) {
		this.state(state);
	}
}

/*
class GateAnd extends LogicDevice {
	constructor(position: SimpleSignal<Vector2>, unique_name: string | null = null) {
		super(
			[
				[new Vector2(-2, -1), new Vector2(-1, 0), true],
				[new Vector2(-2, 1), new Vector2(-1, 0), true],
				[new Vector2(2, 0), new Vector2(1, 0), false],
			],
			position,
			unique_name
		);
	}
	init_view(parent_rect: Rect, grid_size: SimpleSignal<number>) {
		parent_rect.add(<Rect
			ref={this.rect_ref}
			width={() => grid_size() * 8}
			height={() => grid_size() * 4}
			position={() => this.position_px(grid_size)}
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
			<Txt fill={"FFF"} position={() => new Vector2(-grid_size()*0.3, 0)} fontSize={() => grid_size()*1.1}>AND</Txt>
		</Rect>);
		this.init_view_pins(grid_size);
	}
	compute(new_inputs: Array<boolean>) {
		for(let i = 0; i < 2; i++) {
			this.inputs[i].state = new_inputs[i];
		}
		this.outputs[0].state = this.inputs[0].state && this.inputs[1].state;
	}
}

class GateOr extends LogicDevice {
	constructor(position: SimpleSignal<Vector2>, unique_name: string | null = null) {
		super(
			[
				[new Vector2(-2, -1), new Vector2(-1, 0)],
				[new Vector2(-2, 1), new Vector2(-1, 0)]
			],
			[
				[new Vector2(2, 0), new Vector2(1, 0)],
			],
			position,
			false,
			false,
			unique_name
		);
	}
	init_view(parent_rect: Rect, grid_size: SimpleSignal<number>) {
		parent_rect.add(<Rect
			ref={this.rect_ref}
			width={() => grid_size() * 8}
			height={() => grid_size() * 4}
			position={() => this.position_px(grid_size)}
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
			<Txt fill={"FFF"} position={() => new Vector2(-grid_size()*0.3, 0)} fontSize={() => grid_size()*1.1}>OR</Txt>
		</Rect>);
		this.init_view_pins(grid_size);
	}
	compute(new_inputs: Array<boolean>) {
		for(let i = 0; i < 2; i++) {
			this.inputs[i].state = new_inputs[i];
		}
		this.outputs[0].state = this.inputs[0].state || this.inputs[1].state;
	}
}

class GateXor extends LogicDevice {
	constructor(position: SimpleSignal<Vector2>, unique_name: string | null = null) {
		super(
			[
				[new Vector2(-2.3, -1), new Vector2(-0.7, 0)],
				[new Vector2(-2.3, 1), new Vector2(-0.7, 0)]
			],
			[
				[new Vector2(2, 0), new Vector2(1, 0)],
			],
			position,
			false,
			false,
			unique_name
		);
	}
	init_view(parent_rect: Rect, grid_size: SimpleSignal<number>) {
		parent_rect.add(<Rect
			ref={this.rect_ref}
			width={() => grid_size() * 8}
			height={() => grid_size() * 4}
			position={() => this.position_px(grid_size)}
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
			<Txt fill={"FFF"} position={() => new Vector2(-grid_size()*0.3, 0)} fontSize={() => grid_size()*1.1}>XOR</Txt>
		</Rect>);
		this.init_view_pins(grid_size);
	}
	compute(new_inputs: Array<boolean>) {
		for(let i = 0; i < 2; i++) {
			this.inputs[i].state = new_inputs[i];
		}
		this.outputs[0].state = this.inputs[0].state != this.inputs[1].state;
	}
}

class GateNand extends LogicDevice {
	constructor(position: SimpleSignal<Vector2>, unique_name: string | null = null) {
		super(
			[
				[new Vector2(-2, -1), new Vector2(-1, 0)],
				[new Vector2(-2, 1), new Vector2(-1, 0)]
			],
			[
				[new Vector2(3, 0), new Vector2(1, 0)],
			],
			position,
			false,
			false,
			unique_name
		);
	}
	init_view(parent_rect: Rect, grid_size: SimpleSignal<number>) {
		parent_rect.add(<Rect
			ref={this.rect_ref}
			width={() => grid_size() * 8}
			height={() => grid_size() * 4}
			position={() => this.position_px(grid_size)}
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
			<Txt fill={"FFF"} position={() => new Vector2(0, 0)} fontSize={() => grid_size()*1.1}>NAND</Txt>
		</Rect>);
		this.init_view_pins(grid_size);
	}
	compute(new_inputs: Array<boolean>) {
		for(let i = 0; i < 2; i++) {
			this.inputs[i].state = new_inputs[i];
		}
		this.outputs[0].state = !(this.inputs[0].state && this.inputs[1].state);
	}
}*/

export class GateNor extends LogicDevice {
	constructor(position: SimpleSignal<Vector2>, unique_name: string | null = null) {
		super(
			[
				[new Vector2(-2, -1), new Vector2(-1, 0)],
				[new Vector2(-2, 1), new Vector2(-1, 0)],
				[new Vector2(3, 0), new Vector2(1, 0)]
			],
			position,
			unique_name
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
			<Txt fill={"FFF"} position={() => new Vector2(-grid_size()*0.3, 0)} fontSize={() => grid_size()*1.1}>NOR</Txt>
		</Rect>);
		this.init_view_pins(grid_size);
	}
	compute() {
		this.pins[2].state = !(this.pins[0].state || this.pins[1].state);
	}
}
/*
class GateXnor extends LogicDevice {
	constructor(position: SimpleSignal<Vector2>, unique_name: string | null = null) {
		super(
			[
				[new Vector2(-2.3, -1), new Vector2(-0.7, 0)],
				[new Vector2(-2.3, 1), new Vector2(-0.7, 0)]
			],
			[
				[new Vector2(3, 0), new Vector2(1, 0)],
			],
			position,
			false,
			false,
			unique_name
		);
	}
	init_view(parent_rect: Rect, grid_size: SimpleSignal<number>) {
		parent_rect.add(<Rect
			ref={this.rect_ref}
			width={() => grid_size() * 8}
			height={() => grid_size() * 4}
			position={() => this.position_px(grid_size)}
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
			<Txt fill={"FFF"} position={() => new Vector2(-grid_size()*0.1, 0)} fontSize={() => grid_size()*1.1}>XNOR</Txt>
		</Rect>);
		this.init_view_pins(grid_size);
	}
	compute(new_inputs: Array<boolean>) {
		for(let i = 0; i < 2; i++) {
			this.inputs[i].state = new_inputs[i];
		}
		this.outputs[0].state = this.inputs[0].state == this.inputs[1].state;
	}
}

class GateNot extends LogicDevice {
	constructor(position: SimpleSignal<Vector2>, unique_name: string | null = null) {
		super(
			[
				[new Vector2(-2, 0), new Vector2(-1, 0)]
			],
			[
				[new Vector2(3, 0), new Vector2(1, 0)],
			],
			position,
			false,
			false,
			unique_name
		);
	}
	init_view(parent_rect: Rect, grid_size: SimpleSignal<number>) {
		parent_rect.add(<Rect
			ref={this.rect_ref}
			width={() => grid_size() * 8}
			height={() => grid_size() * 4}
			position={() => this.position_px(grid_size)}
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
			<Txt fill={"FFF"} position={() => new Vector2(-grid_size()*0.5, 0)} fontSize={() => grid_size()*1.1}>NOT</Txt>
		</Rect>);
		this.init_view_pins(grid_size);
	}
	compute(new_inputs: Array<boolean>) {
		this.inputs[0].state = new_inputs[0];
		this.outputs[0].state = !this.inputs[0].state;
	}
}*/