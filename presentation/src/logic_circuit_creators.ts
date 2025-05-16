import { LogicDevice, LogicCircuit, LogicCircuitToplevelWrapper, GateAnd, GateNand, GateOr, GateNor, GateXor, GateXnor, GateNot, LogicConnectionPin } from './logic_sim';
import { Vector2, createSignal } from '@motion-canvas/core';

export function create_nor_flip_flop(): LogicCircuit {
    let out = new LogicCircuit(
        [
            new GateNor(createSignal(new Vector2(0, -3)), "Nor-0"),
            new GateNor(createSignal(new Vector2(0, 3)), "Nor-1")
        ],
        [
            [new LogicConnectionPin(new Vector2(-3, -4), new Vector2(-1, 0)), "In-0"],
            [new LogicConnectionPin(new Vector2(-3, 4), new Vector2(-1, 0)), "In-1"],
            [new LogicConnectionPin(new Vector2(4, -3), new Vector2(1, 0)), "Q#"],
            [new LogicConnectionPin(new Vector2(4, 3), new Vector2(1, 0)), "Q"]
        ],
        [
            [
                ["In-0", ["Nor-0", 0]],
                []
            ],
            [
                ["In-1", ["Nor-1", 1]],
                []
            ],
            [
                [["Nor-0", 2], ["Nor-1", 0], "Q#"],
                [
                    [new Vector2(4, -3), [[0, 2], [-7, 2], [0, 1]]]
                ]
            ],
            [
                [["Nor-1", 2], ["Nor-0", 1], "Q"],
                [
                    [new Vector2(4, 3), [[0, -2], [-7, -2], [0, -1]]]
                ]
            ]
        ],
        createSignal(40),
        createSignal(new Vector2(0, 0))
    );
    out.set_pin_state("In-0", true);
    out.set_pin_state("In-1", false);
    return out;
}

export function create_d_level_latch(): LogicCircuit {
    let ff = create_nor_flip_flop();
    ff.unique_name = "ff";
    let out = new LogicCircuit(
        [
            ff,
            new GateNot(createSignal(new Vector2(-7, -6)), "not"),
            new GateAnd(createSignal(new Vector2(-7, -2)), "and-0"),
            new GateAnd(createSignal(new Vector2(-7, 2)), "and-1"),
        ],
        [
            [new LogicConnectionPin(new Vector2(-3, -4), new Vector2(-1, 0)), "D"],
            [new LogicConnectionPin(new Vector2(-3, 4), new Vector2(-1, 0)), "CLK"],
            [new LogicConnectionPin(new Vector2(4, -3), new Vector2(1, 0)), "Q#"],
            [new LogicConnectionPin(new Vector2(4, 3), new Vector2(1, 0)), "Q"]
        ],
        [
            [
                ["D", ["and-0", 0], ["not", 0]],
                []
            ],
            [
                [["not", 1], ["and-1", 1]],
                []
            ],
            [
                [["and-0", 2], ["ff", 0]],
                []
            ],
            [
                [["and-1", 2], ["ff", 1]],
                []
            ],
            [
                ["CLK", ["and-0", 1], ["and-1", 0]],
                []
            ],
            [
                [["ff", 2], "Q#"],
                []
            ],
            [
                [["ff", 3], "Q"],
                []
            ]
        ],
        createSignal(40),
        createSignal(new Vector2(0, 0))
    );
    out.set_pin_state("D", false);
    out.set_pin_state("CLK", true);
    return out;
}