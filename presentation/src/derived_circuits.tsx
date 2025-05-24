import { Line, Rect, Txt, View2D, Circle } from '@motion-canvas/2d';
import { LogicDevice, LogicCircuit, LogicCircuitToplevelWrapper, GateAnd, GateNand, GateOr, GateNor, GateXor, GateXnor, GateNot, LogicConnectionPin, FONT_GRID_SIZE_SCALE, TriBuffer, LogicNet } from './logic_sim';
import { Vector2, createSignal, SimpleSignal } from '@motion-canvas/core';

export function create_nor_flip_flop(grid_size: SimpleSignal<number>, unique_name: string | null = null): LogicCircuit {
	let out = new LogicCircuit(
		[
			new GateNor(createSignal(new Vector2(0, -3)), "Nor-0"),
			new GateNor(createSignal(new Vector2(0, 3)), "Nor-1")
		],
		[
			new LogicConnectionPin(new Vector2(-3, -4), 'w', "In-0"),
			new LogicConnectionPin(new Vector2(-3, 4), 'w', "In-1"),
			new LogicConnectionPin(new Vector2(4, -3), 'e', "Q#"),
			new LogicConnectionPin(new Vector2(4, 3), 'e', "Q")
		],
		[
			[
				["In-0", ["Nor-0", 'a']],
				[], []
			],
			[
				["In-1", ["Nor-1", 'b']],
				[], []
			],
			[
				[["Nor-0", 'q'], ["Nor-1", 'a'], "Q#"],
				[
					[new Vector2(4, -3), [[0, 2], [-7, 2], [0, 1]]]
				], [new Vector2(4, -3)]
			],
			[
				[["Nor-1", 'q'], ["Nor-0", 'b'], "Q"],
				[
					[new Vector2(4, 3), [[0, -2], [-7, -2], [0, -1]]]
				], [new Vector2(4, 3)]
			]
		],
		grid_size,
		createSignal(new Vector2(0, 0)),
		unique_name,
		2
	);
	out.set_pin_state("In-0", true);
	out.set_pin_state("In-1", false);
	return out;
}

export function create_d_level_latch(grid_size: SimpleSignal<number>, unique_name: string | null = null): LogicCircuit {
	let ff = create_nor_flip_flop(grid_size, "ff");
	let out = new LogicCircuit(
		[
			ff,
			new GateNot(createSignal(new Vector2(-13, -5)), "not"),
			new GateAnd(createSignal(new Vector2(-6, -4)), "and-0"),
			new GateAnd(createSignal(new Vector2(-6, 4)), "and-1"),
		],
		[
			new LogicConnectionPin(new Vector2(-17, -3), 'w', "D"),
			new LogicConnectionPin(new Vector2(-17, 3), 'w', "CLK"),
			new LogicConnectionPin(new Vector2(4, 3), 'e', "Q#"),
			new LogicConnectionPin(new Vector2(4, -3), 'e', "Q")
		],
		[
			[
				["D", ["and-1", 'b'], ["not", 'a']],
				[
					[new Vector2(-17, -3), [[1, 0], [0, -2]]],
					[new Vector2(-16, -3), [[0, 8], [7, 0]]]
				],
				[new Vector2(-16, -3)]
			],
			[
				[["not", 'q'], ["and-0", 'a']],
				[], []
			],
			[
				[["and-0", 'q'], ["ff", 'In-0']],
				[], []
			],
			[
				[["and-1", 'q'], ["ff", 'In-1']],
				[], []
			],
			[
				["CLK", ["and-0", 'b'], ["and-1", 'a']],
				[
					[new Vector2(-17, 3), [[8, 0]]],
					[new Vector2(-9, -3), [[0, 6]]]
				], [new Vector2(-9, 3)]
			],
			[
				[["ff", 'Q#'], "Q"],
				[], []
			],
			[
				[["ff", 'Q'], "Q#"],
				[], []
			]
		],
		grid_size,
		createSignal(new Vector2(7, 0)),
		unique_name
	);
	out.set_pin_state("D", false);
	out.set_pin_state("CLK", true);
	out.compute();// Make sure it is in a stable state
	out.compute();
	return out;
}

export class LayoutQuadAnd extends LogicCircuit {
	static half_height: number = 8;
	constructor(grid_size: SimpleSignal<number>, position_grid: SimpleSignal<Vector2> | (() => Vector2) = createSignal(new Vector2(0, 0))) {
		super(
			[
				new GateAnd(createSignal(new Vector2(-10, 4)), "and-0"),
				new GateAnd(createSignal(new Vector2(5, 4)), "and-1"),
				new GateAnd(createSignal(new Vector2(10, -4)), "and-2"),
				new GateAnd(createSignal(new Vector2(-5, -4)), "and-3")
			],
			[
				new LogicConnectionPin(new Vector2(-15, LayoutQuadAnd.half_height), 's', "1"),
				new LogicConnectionPin(new Vector2(-10, LayoutQuadAnd.half_height), 's', "2"),
				new LogicConnectionPin(new Vector2(-5, LayoutQuadAnd.half_height), 's', "3"),
				new LogicConnectionPin(new Vector2(0, LayoutQuadAnd.half_height), 's', "4"),
				new LogicConnectionPin(new Vector2(5, LayoutQuadAnd.half_height), 's', "5"),
				new LogicConnectionPin(new Vector2(10, LayoutQuadAnd.half_height), 's', "6"),
				new LogicConnectionPin(new Vector2(15, LayoutQuadAnd.half_height), 's', "7"),
				new LogicConnectionPin(new Vector2(15, -LayoutQuadAnd.half_height), 'n', "8"),
				new LogicConnectionPin(new Vector2(10, -LayoutQuadAnd.half_height), 'n', "9"),
				new LogicConnectionPin(new Vector2(5, -LayoutQuadAnd.half_height), 'n', "10"),
				new LogicConnectionPin(new Vector2(0, -LayoutQuadAnd.half_height), 'n', "11"),
				new LogicConnectionPin(new Vector2(-5, -LayoutQuadAnd.half_height), 'n', "12"),
				new LogicConnectionPin(new Vector2(-10, -LayoutQuadAnd.half_height), 'n', "13"),
				new LogicConnectionPin(new Vector2(-15, -LayoutQuadAnd.half_height), 'n', "14"),
			],
			[
				[
					['1', ['and-0', 'a']],
					[[new Vector2(-15, 8), [[0, -5], [3, 0]]]], []
				],
				[
					['2', ['and-0', 'b']],
					[[new Vector2(-10, 8), [[0, -1], [-3, 0], [0, -2]]]], []
				],
				[
					['3', ['and-0', 'q']],
					[[new Vector2(-7, 4), [[2, 0], [0, 4]]]], []
				],
				[
					['4', ['and-1', 'a']],
					[[new Vector2(0, 8), [[0, -5], [3, 0]]]], []
				],
				[
					['5', ['and-1', 'b']],
					[[new Vector2(5, 8), [[0, -1], [-3, 0], [0, -2]]]], []
				],
				[
					['6', ['and-1', 'q']],
					[[new Vector2(8, 4), [[2, 0], [0, 4]]]], []
				],
				[
					['8', ['and-2', 'a']],
					[[new Vector2(15, -8), [[0, 5], [-3, 0]]]], []
				],
				[
					['9', ['and-2', 'b']],
					[[new Vector2(10, -8), [[0, 1], [3, 0], [0, 2]]]], []
				],
				[
					['10', ['and-2', 'q']],
					[[new Vector2(7, -4), [[-2, 0], [0, -4]]]], []
				],
				[
					['11', ['and-3', 'a']],
					[[new Vector2(0, -8), [[0, 5], [-3, 0]]]], []
				],
				[
					['12', ['and-3', 'b']],
					[[new Vector2(-5, -8), [[0, 1], [3, 0], [0, 2]]]], []
				],
				[
					['13', ['and-3', 'q']],
					[[new Vector2(-8, -4), [[-2, 0], [0, -4]]]], []
				],
			],
			grid_size,
			position_grid,
			'quad-and-layout'
		);
		let pins_to_set_high = ['1', '2', '4', '5', '8', '9', '11', '12'];
		for(let i = 0; i < pins_to_set_high.length; i++) {
			this.set_pin_state(pins_to_set_high[i], true);
		}
	}
	init_view(view: View2D | Rect): void {
		super.init_view(view);
		this.rect_ref().add(<Line
			points={[
				() => new Vector2(-17, 2).scale(this.grid_size()),
				() => new Vector2(-17, LayoutQuadAnd.half_height).scale(this.grid_size()),
				() => new Vector2(17, LayoutQuadAnd.half_height).scale(this.grid_size()),
				() => new Vector2(17, -LayoutQuadAnd.half_height).scale(this.grid_size()),
				() => new Vector2(-17, -LayoutQuadAnd.half_height).scale(this.grid_size()),
				() => new Vector2(-17, -2).scale(this.grid_size()),
			]}
			stroke={'#FFF'}
			lineWidth={2}
		/>);
		this.rect_ref().add(<Circle
			width={() => this.grid_size() * 4}
			height={() => this.grid_size() * 4}
			position={() => new Vector2(-17, 0).scale(this.grid_size())}
			stroke={'#FFF'}
			lineWidth={2}
			startAngle={-90}
			endAngle={90}
		/>);
		this.rect_ref().add(<Txt fontSize={() => this.grid_size()*FONT_GRID_SIZE_SCALE} position={() => new Vector2(-15, -7).scale(this.grid_size())} fill={'#FFF'}>POWER</Txt>);
		this.rect_ref().add(<Txt fontSize={() => this.grid_size()*FONT_GRID_SIZE_SCALE} position={() => new Vector2(15, 7).scale(this.grid_size())} fill={'#FFF'}>GND</Txt>);
		this.components[2].rect_ref().rotation(180);
		this.components[3].rect_ref().rotation(180);
	}
}

export class DLatchEdge extends LogicDevice {
	prev_clock_state: boolean;
	state: SimpleSignal<boolean>;
	constructor(position: SimpleSignal<Vector2>, unique_name: string | null = null) {
		super(
			[
				new LogicConnectionPin(new Vector2(-3, -2), 'w', "D"),
				new LogicConnectionPin(new Vector2(-3, 2), 'w', "CLK"),
				new LogicConnectionPin(new Vector2(3, 2), 'e', "Q#"),
				new LogicConnectionPin(new Vector2(3, -2), 'e', "Q")
			],
			position,
			unique_name
		);
		this.pins[0].internally_driven = false;
		this.pins[1].internally_driven = false;
		this.pins[2].internally_driven = true;
		this.pins[3].internally_driven = true;
		this.state = createSignal(false);
	}
	init_view(parent_rect: Rect, grid_size: SimpleSignal<number>): void {
		parent_rect.add(<Rect
			ref={this.rect_ref}
			position={() => this.position_px(grid_size)}
		>
			<Line
				points={[
					() => new Vector2(-3, -3).scale(grid_size()),
					() => new Vector2(3, -3).scale(grid_size()),
					() => new Vector2(3, 3).scale(grid_size()),
					() => new Vector2(-3, 3).scale(grid_size()),
					() => new Vector2(-3, -3).scale(grid_size())
				]}
				stroke={this.border_stroke}
				lineWidth={2}
			/>
			<Line
				points={[
					() => new Vector2(-2.5, 2.5).scale(grid_size()),
					() => new Vector2(-2, 2.5).scale(grid_size()),
					() => new Vector2(-2, 1.5).scale(grid_size()),
					() => new Vector2(-1.5, 1.5).scale(grid_size())
				]}
				stroke={this.border_stroke}
				lineWidth={2}
			/>
			<Txt
				text={'Data Latch'}
				fontSize={() => grid_size()*FONT_GRID_SIZE_SCALE}
				fill={'#FFF'}
				alignContent={'center'}
				position={() => new Vector2(0, -1).scale(grid_size())}
			/>
			<Txt
				text={() => this.state()? '1' : '0'}
				fontSize={() => grid_size()*FONT_GRID_SIZE_SCALE}
				fill={'#FFF'}
				alignContent={'center'}
				position={() => new Vector2(0, 1).scale(grid_size())}
			/>
		</Rect>);
		this.init_view_pins(grid_size);
	}
	compute_private(): void {
		if(this.pins[1].state && !this.prev_clock_state) {
			let state = this.pins[0].state;
			this.pins[2].state = !state;
			this.pins[3].state = state;
			this.state(state);
		}
		this.prev_clock_state = this.pins[1].state;
	}
	static create_internal_circuit(grid_size: SimpleSignal<number>, unique_name: string | null = null): LogicCircuit {
		let ff = create_nor_flip_flop(grid_size, "ff");
		let out = new LogicCircuit(
			[
				ff,
				new GateNot(createSignal(new Vector2(-13, -5)), "not"),
				new GateAnd(createSignal(new Vector2(-6, -4)), "and-0"),
				new GateAnd(createSignal(new Vector2(-6, 4)), "and-1"),
				new GateNot(createSignal(new Vector2(-20, 0)), "edge-not"),
				new GateAnd(createSignal(new Vector2(-12, 1)), "edge-and")
			],
			[
				new LogicConnectionPin(new Vector2(-23, -3), 'w', "D"),
				new LogicConnectionPin(new Vector2(-23, 3), 'w', "CLK"),
				new LogicConnectionPin(new Vector2(4, 3), 'e', "Q#"),
				new LogicConnectionPin(new Vector2(4, -3), 'e', "Q")
			],
			[
				[
					["D", ["and-1", 'b'], ["not", 'a']],
					[
						[new Vector2(-23, -3), [[7, 0], [0, -2]]],
						[new Vector2(-16, -3), [[0, 8], [7, 0]]]
					],
					[new Vector2(-16, -3)]
				],
				[
					[["not", 'q'], ["and-0", 'a']],
					[], []
				],
				[
					[["and-0", 'q'], ["ff", 'In-0']],
					[], []
				],
				[
					[["and-1", 'q'], ["ff", 'In-1']],
					[], []
				],
				[
					[['edge-and', 'q'], ["and-0", 'b'], ["and-1", 'a']],
					[
						[new Vector2(-9, -3), [[0, 6]]]
					], [new Vector2(-9, 1)]
				],
				[
					[["ff", 'Q#'], "Q"],
					[], []
				],
				[
					[["ff", 'Q'], "Q#"],
					[], []
				],
				[
					[['edge-not', 'q'], ['edge-and', 'a']],
					[
						[new Vector2(-16, 0), [[1, 0]]]
					], []
				],
				[
					['CLK', ['edge-not', 'a'], ['edge-and', 'b']],
					[
						[new Vector2(-23, 3), [[0, -3]]],
						[new Vector2(-23, 3), [[8, 0], [0, -1]]]
					],
					[new Vector2(-23, 3)]
				]
			],
			grid_size,
			createSignal(new Vector2(10, 0)),
			unique_name
		);
		out.set_pin_state("D", false);
		// Make sure the FF is stable
		out.set_pin_state("CLK", false);
		out.compute();
		out.compute();
		out.compute();
		out.compute();
		out.set_pin_state("CLK", true);
		out.compute();
		out.compute();
		out.compute();
		return out;
	}
}

export class DLatchEdge8Bit extends LogicDevice {
	prev_clock_state: boolean;
	state: SimpleSignal<number>;
	constructor(position: SimpleSignal<Vector2>, unique_name: string | null = null) {
		super(
			DLatchEdge8Bit.create_logic_connection_pins(-3, 3, -5, 1),
			position,
			unique_name
		);
		for(let i = 0; i < 8; i++) {
			this.query_pin(`D${i}`).internally_driven = false;
			this.query_pin(`Q${i}`).internally_driven = true;
		}
		this.query_pin('CLK').internally_driven = false;
		this.query_pin('OE').internally_driven = false;
		this.state = createSignal(0);
	}
	static create_logic_connection_pins(start_x: number, end_x: number, start_y: number, y_inc: number): Array<LogicConnectionPin> {
		let out: Array<LogicConnectionPin> = [];
		for(let i = 0; i < 8; i++) {
			let y = start_y + y_inc*i;
			out.push(new LogicConnectionPin(new Vector2(start_x, y), 'w', `D${i}`));
			out.push(new LogicConnectionPin(new Vector2(end_x, y), 'e', `Q${i}`));
		}
		out.push(new LogicConnectionPin(new Vector2(start_x, start_y + 2 + y_inc*7), 'w', "CLK"));
		out.push(new LogicConnectionPin(new Vector2(start_x, start_y + 3 + y_inc*7), 'w', "OE"));
		return out;
	}
	init_view(parent_rect: View2D | Rect, grid_size: SimpleSignal<number>): void {
		parent_rect.add(<Rect
			ref={this.rect_ref}
			position={() => this.position_px(grid_size)}
		>
			<Line
				points={[
					() => new Vector2(-3, -6).scale(grid_size()),
					() => new Vector2(3, -6).scale(grid_size()),
					() => new Vector2(3, 6).scale(grid_size()),
					() => new Vector2(-3, 6).scale(grid_size()),
					() => new Vector2(-3, -6).scale(grid_size())
				]}
				stroke={this.border_stroke}
				lineWidth={2}
			/>
			<Line
				points={[
					() => new Vector2(-2.5, 4.5).scale(grid_size()),
					() => new Vector2(-2, 4.5).scale(grid_size()),
					() => new Vector2(-2, 4).scale(grid_size()),
					() => new Vector2(-2, 3.5).scale(grid_size()),
					() => new Vector2(-1.5, 3.5).scale(grid_size())
				]}
				stroke={this.border_stroke}
				lineWidth={2}
			/>
			<Txt
				text={'8 Bit Latch'}
				fontSize={() => grid_size()*FONT_GRID_SIZE_SCALE}
				fill={'#FFF'}
				alignContent={'center'}
				position={() => new Vector2(0, -1).scale(grid_size())}
			/>
			<Txt
				text={() => String(this.state())}
				fontSize={() => grid_size()*FONT_GRID_SIZE_SCALE}
				fill={'#FFF'}
				alignContent={'center'}
				position={() => new Vector2(0, 1).scale(grid_size())}
			/>
		</Rect>);
		this.init_view_pins(grid_size);
	}
	compute_private(): void {
		if(this.pins[16].state && !this.prev_clock_state) {
			for(let i = 0; i < 8; i++) {
				this.query_pin(`Q${i}`).state = this.query_pin(`D${i}`).state;
			}
		}
		this.prev_clock_state = this.query_pin('CLK').state;
		this.set_output_enable_state(this.query_pin('OE').state);
	}
	set_output_enable_state(state: boolean): void {
		for(let i = 0; i < 8; i++) {
			this.query_pin(`Q${i}`).internally_driven = state;
		}
	}
	static create_internal_circuit(grid_size: SimpleSignal<number>, unique_name: string | null = null): LogicCircuit {
		let latches_x: number = -5;
		let buffers_x: number = 2;
		let latches_y_start: number = -24;
		let buffers_y_start: number = -26;
		let pins_y_start: number = -26;
		let y_increment: number = 7;
		let pin_input_x: number = -10;
		let pin_output_x: number = 5;
		let clock_conn_y: number = 25;
		let oe_conn_y: number = clock_conn_y+1;
		// Create components
		let components: Array<LogicDevice> = [];
		// Latches
		for(let i = 0; i < 8; i++) {
			components.push(new DLatchEdge(createSignal(new Vector2(latches_x, latches_y_start + y_increment*i)), `latch-${i}`));
		}
		// OE buffers
		for(let i = 0; i < 8; i++) {
			components.push(new TriBuffer(createSignal(new Vector2(buffers_x, buffers_y_start + y_increment*i)), `buffer-${i}`));
		}
		// Create nets
		let nets: Array<[
			Array<[string, string] | string>,// Components are referenced by their name and a pin name, an external connection is referenced by its name
			Array<[Vector2, Array<[number, number]>]>,// Wires (just for graphics)
			Array<Vector2> | null// Connection dots (just for graphics)
		]> = [];
		for(let i = 0; i < 8; i++) {
			// Data input
			nets.push([
				[`D${i}`, [`latch-${i}`, 'D']], [[new Vector2(pin_input_x, pins_y_start + i*y_increment), [[1, 0]]]], []
			]);
			// latch -> buffer
			nets.push([
				[[`latch-${i}`, 'Q'], [`buffer-${i}`, 'A']], [], []
			]);
			// buffer -> output
			nets.push([
				[[`buffer-${i}`, 'Q'], `Q${i}`], [], []
			]);
		}
		// CLK & OE
		let clock_dests: Array<[string, string] | string> = ['CLK'];
		let clock_wires: Array<[Vector2, Array<[number, number]>]> = [
			[new Vector2(pin_input_x, clock_conn_y), [[1, 0]]],
			[new Vector2(pin_input_x+1, latches_y_start+2), [[0, y_increment*7]]]
		];
		let clock_points: Array<Vector2> = [
			new Vector2(pin_input_x+1, clock_conn_y)
		];
		let oe_dests: Array<[string, string] | string> = ['OE'];
		let oe_wires: Array<[Vector2, Array<[number, number]>]> = [
			[new Vector2(pin_input_x, oe_conn_y), [[0, 3], [15, 0], [0, -57]]]
		];
		let oe_points: Array<Vector2> = [];
		for(let i = 0; i < 8; i++) {
			clock_dests.push([`latch-${i}`, 'CLK']);
			if(i >= 1 && i < 7) {
				clock_points.push(new Vector2(pin_input_x+1, latches_y_start+2+y_increment*i));
			}
			oe_dests.push([`buffer-${i}`, 'OE']);
			oe_wires.push([new Vector2(buffers_x, buffers_y_start+y_increment*i-2), [[3, 0]]]);
			if(i >= 1) {
				oe_points.push(new Vector2(buffers_x+3, buffers_y_start+y_increment*i-2));
			}
		}
		nets.push([
			clock_dests, clock_wires, clock_points
		]);
		nets.push([
			oe_dests, oe_wires, oe_points
		]);
		// Create ext connections
		let ext_conns: Array<LogicConnectionPin> = DLatchEdge8Bit.create_logic_connection_pins(pin_input_x, pin_output_x, pins_y_start, y_increment);
		let out = new LogicCircuit(
			components,
			ext_conns,
			nets,
			grid_size,
			createSignal(new Vector2(10, 0)),
			unique_name
		);
		out.compute();
		return out;
	}
}

export class MemoryBlock256 extends LogicDevice {
	prev_write_clock_state: boolean;
	constructor(position: SimpleSignal<Vector2>, unique_name: string | null = null) {
		super(
			DLatchEdge8Bit.create_logic_connection_pins(-3, 3, -5, 1),
			position,
			unique_name
		);
		for(let i = 0; i < 8; i++) {
			this.query_pin(`D${i}`).internally_driven = false;
			this.query_pin(`Q${i}`).internally_driven = true;
		}
		this.query_pin('CLK').internally_driven = false;
		this.query_pin('OE').internally_driven = false;
		this.prev_write_clock_state = false;
	}
	static create_logic_connection_pins(start_x: number, end_x: number, start_y: number, y_inc: number): Array<LogicConnectionPin> {
		let out: Array<LogicConnectionPin> = [];
		for(let i = 0; i < 8; i++) {
			let y = start_y + y_inc*i;
			out.push(new LogicConnectionPin(new Vector2(start_x, y), 'w', `D${i}`));
			out.push(new LogicConnectionPin(new Vector2(end_x, y), 'e', `Q${i}`));
		}
		out.push(new LogicConnectionPin(new Vector2(start_x, start_y + 2 + y_inc*7), 'w', "CLK"));
		out.push(new LogicConnectionPin(new Vector2(start_x, start_y + 3 + y_inc*7), 'w', "OE"));
		return out;
	}
	init_view(parent_rect: View2D | Rect, grid_size: SimpleSignal<number>): void {
		// TODO
		parent_rect.add(<Rect
			ref={this.rect_ref}
			position={() => this.position_px(grid_size)}
		>
			
		</Rect>);
		this.init_view_pins(grid_size);
	}
	compute_private(): void {
		// TODO
	}
	set_output_enable_state(state: boolean): void {
		for(let i = 0; i < 8; i++) {
			this.query_pin(`Q${i}`).internally_driven = state;
		}
	}
	static create_internal_circuit(grid_size: SimpleSignal<number>, unique_name: string | null = null): LogicCircuit {
		// TODO
		let latches_x: number = -5;
		let buffers_x: number = 2;
		let latches_y_start: number = -24;
		let buffers_y_start: number = -26;
		let pins_y_start: number = -26;
		let y_increment: number = 7;
		let pin_input_x: number = -10;
		let pin_output_x: number = 5;
		// Create components
		let components: Array<LogicDevice> = [];
		// Latches
		for(let i = 0; i < 8; i++) {
			components.push(new DLatchEdge(createSignal(new Vector2(latches_x, latches_y_start + y_increment*i)), `latch-${i}`));
		}
		// OE buffers
		for(let i = 0; i < 8; i++) {
			components.push(new TriBuffer(createSignal(new Vector2(buffers_x, buffers_y_start + y_increment*i)), `buffer-${i}`));
		}
		// Create nets
		let nets: Array<[
			Array<[string, string] | string>,// Components are referenced by their name and a pin name, an external connection is referenced by its name
			Array<[Vector2, Array<[number, number]>]>,// Wires (just for graphics)
			Array<Vector2> | null// Connection dots (just for graphics)
		]> = [];
		for(let i = 0; i < 8; i++) {
			// Data input
			nets.push([
				[`D${i}`, [`latch-${i}`, 'D']], [[new Vector2(pin_input_x, pins_y_start + i*y_increment), [[1, 0]]]], []
			]);
			// latch -> buffer
			nets.push([
				[[`latch-${i}`, 'Q'], [`buffer-${i}`, 'A']], [], []
			]);
			// buffer -> output
			nets.push([
				[[`buffer-${i}`, 'Q'], `Q${i}`], [], []
			]);
		}
		// CLK & OE
		let clock_dests: Array<[string, string] | string> = ['CLK']
		let oe_dests: Array<[string, string] | string> = ['OE']
		for(let i = 0; i < 8; i++) {
			clock_dests.push([`latch-${i}`, 'CLK']);
			oe_dests.push([`buffer-${i}`, 'OE']);
		}
		nets.push([
			clock_dests, [], []
		]);
		nets.push([
			oe_dests, [], []
		]);
		// Create ext connections
		let ext_conns: Array<LogicConnectionPin> = DLatchEdge8Bit.create_logic_connection_pins(pin_input_x, pin_output_x, pins_y_start, y_increment);
		let out = new LogicCircuit(
			components,
			ext_conns,
			nets,
			grid_size,
			createSignal(new Vector2(10, 0)),
			unique_name
		);
		out.compute();
		return out;
	}
}

/*export class FullAdder extends LogicDevice {
	constructor(position: SimpleSignal<Vector2>, unique_name: string | null = null) {
		super(
			[
				new LogicConnectionPin(new Vector2(0, -3), 'n', "Cin"),
				new LogicConnectionPin(new Vector2(-3, -2), 'w', "A"),
				new LogicConnectionPin(new Vector2(-3, 2), 'w', "B"),
				new LogicConnectionPin(new Vector2(3, 2), 'e', "Out"),
				new LogicConnectionPin(new Vector2(0, 3), 's', "Cout")
			],
			position,
			unique_name
		);
		this.pins[0].internally_driven = false;
		this.pins[1].internally_driven = false;
		this.pins[2].internally_driven = false;
		this.pins[3].internally_driven = true;
		this.pins[4].internally_driven = true;
	}
	init_view(parent_rect: Rect, grid_size: SimpleSignal<number>): void {
		parent_rect.add(<Rect
			ref={this.rect_ref}
			position={() => this.position_px(grid_size)}
		>
			<Line
				points={[
					() => new Vector2(-3, -3).scale(grid_size()),
					() => new Vector2(3, -3).scale(grid_size()),
					() => new Vector2(3, 3).scale(grid_size()),
					() => new Vector2(-3, 3).scale(grid_size()),
					() => new Vector2(-3, -3).scale(grid_size())
				]}
				stroke={this.border_stroke}
				lineWidth={2}
			/>
			<Txt
				text={'Full Adder'}
				fontSize={() => grid_size()*FONT_GRID_SIZE_SCALE}
				fill={'#FFF'}
				alignContent={'center'}
				position={() => new Vector2(0, -1).scale(grid_size())}
			/>
		</Rect>);
		this.init_view_pins(grid_size);
	}
	compute_private(): void {
		let out = (this.query_pin('A').state ? 1 : 0) + (this.query_pin('B').state ? 1 : 0) + (this.query_pin('Cin').state ? 1 : 0);
		this.query_pin('Out').state = (out & 1) + 0;
		this.query_pin('Cout').state = ((out >> 1) & 1) + 0;
	}
}*/