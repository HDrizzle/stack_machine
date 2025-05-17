import { LogicDevice, LogicCircuit, LogicCircuitToplevelWrapper, GateAnd, GateNand, GateOr, GateNor, GateXor, GateXnor, GateNot, LogicConnectionPin } from './logic_sim';
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
				], []
			],
			[
				[["Nor-1", 'q'], ["Nor-0", 'b'], "Q"],
				[
					[new Vector2(4, 3), [[0, -2], [-7, -2], [0, -1]]]
				], []
			]
		],
		grid_size,
		createSignal(new Vector2(0, 0)),
		unique_name
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
				[], [new Vector2(4, -3)]
			],
			[
				[["ff", 'Q'], "Q#"],
				[], [new Vector2(4, 3)]
			]
		],
		grid_size,
		createSignal(new Vector2(7, 0)),
		unique_name
	);
	out.set_pin_state("D", false);
	out.set_pin_state("CLK", true);
	return out;
}
/*
class DLatchLevel extends LogicDevice {
	constructor(position: SimpleSignal<Vector2>, unique_name: string | null = null) {
		super(
			[
				new LogicConnectionPin()
			],
			createSignal(new Vector2(0, 0)),
			unique_name
		);
	}
}*/