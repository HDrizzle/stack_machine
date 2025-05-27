import {Circle, Layout, makeScene2D, Rect, View2D, Txt, Img, Code, vector2Signal, Line, CircleSegment} from '@motion-canvas/2d';
import {all, beginSlide, waitFor, createRef, Reference, Signal, SimpleSignal, createSignal, DEFAULT, Color, Vector2Signal, Vector2, SignalTween, SimpleVector2Signal, useLogger, easeInOutCubic, SignalGenerator, delay} from '@motion-canvas/core';
import title_slide_background from '../../images/title_slide_background.png';
import bool_value_scrot from '../../images/bool_value_scrot.png';
import binary_decimal from '../../images/binary-decimal.png';
import bin_to_dec from '../../images/bin_to_dec_gsheets.png';
import bin_to_hex from '../../images/bin_to_hex_gsheets.png';
import led_off from '../../images/led_off.jpeg';
import led_on from '../../images/led_on.jpeg';
import image_chips from '../../images/chips.png';
import image_gpu from '../../images/gpu.jpg';
import image_cpu from '../../images/cpu.jpg';
import image_hard_drive from '../../images/hard_drive.jpg';
import image_ports from '../../images/ports.jpg';
import image_dram from '../../images/dram.png';
import image_quad_and from '../../images/photo_quad_and.jpeg';
import image_8_bit_latch from '../../images/photo_8_bit_latch.jpeg';
import image_starter from '../../images/photo_starter.jpeg';
import image_main_block_diagram from '../../images/main_block_diagram.png';
import { LogicDevice, LogicCircuit, LogicCircuitToplevelWrapper, GateAnd, GateNand, GateOr, GateNor, GateXor, GateXnor, GateNot, LogicConnectionPin } from '../logic_sim';
import { create_nor_flip_flop, create_d_level_latch, DLatchEdge, DLatchEdge8Bit, LayoutQuadAnd, FullAdder, ParameterizedAdder, ParameterizedAdderHorizontal, ParameterizedAdderVertical, MemoryValue, MemoryContainer, create_sequencer_6 } from '../derived_circuits';

/* Slides
-- Title --
Goals
-- Abstract, how to make the magic happen? --
Binary intro
Logic gates, demo with all of them
Chip layout circuit alongside actual photo
Binary numbers
Adder animation sequence
Sequential logic, D latches, edge triggering
SRAM, use photo of actual chip, explain how DRAM and flash are different
Clock
Fetch, Decode, Execute
-- My specific design --
Instructions
What does the hardware have to do?
Timing, use circuitverse timing screenshots
Sequencers
Stack, local variables
ALU
Heap, easy to use for random stuff
Control unit & PC
Call stack
Program memory
-- How to build it, lots of pictures --
Attempt at PCB etching
Parts from China
Soldering...
Problems
What I learned
	Capacitors across chip power pins, use photo of double-pulse on the scope
What I would improve
	Clock scheme
	Standard interface(s)
Acknowledgements
*/


function logic_wire_color(in_: [state: boolean, valid: boolean]): Color {
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

export default makeScene2D(function* (view) {
	// Init
	const half_width = 960;
	const half_height = 540;
	const slide_title_text_size = 60;
	const paragraph_text_size = 30;
	const citation_text_size = 15;
	const generic_slide_top_left_pos = new Vector2(-half_width*0.9, -half_height*0.7);
	view.fill('#000');// Background
	// Slide template
	/*current_slide_title('Slide Name');
	slide_ref = createRef<Rect>();
	view.add(
		<Rect ref={slide_ref} layout topLeft={generic_slide_top_left_pos} width={half_width*1.8} height={half_height*1.7}>
			
		</Rect>
	);
	yield* beginSlide(current_slide_title());
	slide_ref().remove();*/
	// Starting slides
	// -- Title --
	let slide_ref = createRef<Rect>();
	view.add(
		<Rect ref={slide_ref}>
			<Img src={title_slide_background} />
			<Rect layout direction={'column'}>
				<Txt textAlign={'center'} fontSize={80} fill={'#fff'}>Computer Design</Txt>
				<Txt textAlign={'center'} fontSize={40} fill={'#fff'}>Hadrian Ward</Txt>
			</Rect>
		</Rect>
	);
	yield* beginSlide('Title');
	slide_ref().remove();
	// Text in top-left corner
	let slide_title_ref = createRef<Txt>();
	let current_slide_title = createSignal('');
	view.add(<Txt
		ref={slide_title_ref}
		text={current_slide_title}
		fontSize={slide_title_text_size}
		topLeft={new Vector2(-half_width*0.9, -half_height*0.85)}
		width={half_width*1.8}
		textAlign={'left'}
		stroke={'#FFF'}
		fill={'#FFF'}
	/>);
	let bottom_text_ref = createRef<Txt>();
	let bottom_text: SimpleSignal<string> = createSignal('');
	view.add(<Txt text={bottom_text} ref={bottom_text_ref} fontSize={slide_title_text_size} fill={'#FFF'} textAlign={'center'} position={new Vector2(0, half_height*0.85)} />);
	// Goals
	current_slide_title('Goals for this project');
	slide_ref = createRef<Rect>();
	view.add(
		<Rect ref={slide_ref} layout alignContent={'space-around'} topLeft={generic_slide_top_left_pos} width={half_width*1.8} height={half_height*1.7}>
			<Rect layout direction={'column'} grow={1}>
				<Txt fontSize={slide_title_text_size} fill={'#FFF'} paddingBottom={100}>• Tetris</Txt>
				<Txt fontSize={slide_title_text_size} fill={'#FFF'} paddingBottom={100}>• Built with basic chips</Txt>
				<Txt fontSize={slide_title_text_size} fill={'#FFF'} paddingBottom={100}>• (relatively) Simple</Txt>
			</Rect>
			<Rect layout grow={1} direction={'column'}>
				<Rect layout alignItems={'center'} paddingBottom={30}>
					<Txt fontSize={slide_title_text_size} fill={'#FFF'} paddingRight={10}>✅</Txt>
					<Img src={image_chips} maxWidth={half_width*0.7} maxHeight={half_height*0.8} />
				</Rect>
				<Rect layout alignItems={'center'}>
					<Txt fontSize={slide_title_text_size} fill={'#FFF'} paddingRight={10}>❌</Txt>
					<Img src={image_gpu} maxWidth={half_width*0.7} maxHeight={half_height*0.8} />
				</Rect>
			</Rect>
		</Rect>
	);
	yield* beginSlide(current_slide_title());
	slide_ref().remove();
	// Parts of a computer (very basic)
	// Images needed: Hard drive, CPU, Ports, DRAM stick
	current_slide_title('Parts of a Computer');
	slide_ref = createRef<Rect>();
	// TODO
	view.add(
		<Rect ref={slide_ref} layout topLeft={generic_slide_top_left_pos} width={half_width*1.8} height={half_height*1.7}>
			<Rect layout direction={'column'} alignItems={'center'} justifyContent={'center'}>
				<Txt fontSize={slide_title_text_size} fill={'#FFF'}>Storage</Txt>
				<Img src={image_hard_drive} scale={0.2} />
			</Rect>
		</Rect>
	);
	yield* beginSlide(current_slide_title());
	slide_ref().remove();
	// -- Abstract, how to make the magic happen? --
	// Bits intro
	current_slide_title('Bits (Binary Digits)');
	slide_ref = createRef<Rect>();
	view.add(
		<Rect ref={slide_ref} layout direction={'column'} topLeft={generic_slide_top_left_pos} width={half_width*1.8} height={half_height*1.7}>
			<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'center'}>Also called Boolean values, most basic unit of information</Txt>
			<Rect layout grow={1} justifyContent={'space-around'}>
				<Rect layout direction={'column'} justifyContent={'space-around'}>
					<Txt fontSize={slide_title_text_size} fill={'#fff'} textAlign={'center'}>0 Volts</Txt>
					<Txt fontSize={slide_title_text_size} fill={'#fff'} textAlign={'center'}>0</Txt>
					<Txt fontSize={slide_title_text_size} fill={'#fff'} textAlign={'center'}>False</Txt>
					<Img src={led_off} height={half_height*0.5} alignSelf={'center'}></Img>
				</Rect>
				<Rect layout direction={'column'} justifyContent={'space-around'}>
					<Txt fontSize={slide_title_text_size} fill={'#fff'} textAlign={'center'}>5 Volts</Txt>
					<Txt fontSize={slide_title_text_size} fill={'#fff'} textAlign={'center'}>1</Txt>
					<Txt fontSize={slide_title_text_size} fill={'#fff'} textAlign={'center'}>True</Txt>
					<Img src={led_on} height={half_height*0.5} alignSelf={'center'}></Img>
				</Rect>
			</Rect>
		</Rect>
	);
	yield* beginSlide(current_slide_title());
	slide_ref().remove();
	// Logic gates
	current_slide_title('Logic Gates');
	let logic_circuit = new LogicCircuitToplevelWrapper(new LogicCircuit(
		[
			new GateAnd(createSignal(new Vector2(-10, -5)), "And-0"),
			new GateNand(createSignal(new Vector2(-10, 0)), "Nand-0"),
			new GateOr(createSignal(new Vector2(0, -5)), "Or-0"),
			new GateNor(createSignal(new Vector2(0, 0)), "Nor-0"),
			new GateXor(createSignal(new Vector2(10, -5)), "Xor-0"),
			new GateXnor(createSignal(new Vector2(10, 0)), "Xnor-0"),
			new GateNot(createSignal(new Vector2(-10, 5)), "Not")
		],
		[
			new LogicConnectionPin(new Vector2(-15, -11), 'w', "A"),
			new LogicConnectionPin(new Vector2(-15, -9), 'w', "B")
		],
		[
			[
				["A", ["Nand-0", 'a'], ["And-0", 'a'], ["Or-0", 'a'], ["Nor-0", 'a'], ["Xor-0", 'a'], ["Xnor-0", 'a']],
				[
					[new Vector2(-15, -11), [[21, 0]]],
					[new Vector2(-14, -11), [[0, 5], [1, 0]]],
					[new Vector2(-4, -11), [[0, 5], [1, 0]]],
					[new Vector2(6, -11), [[0, 5], [1, 0]]],
					[new Vector2(-14, -6), [[0, 5], [1, 0]]],
					[new Vector2(-4, -6), [[0, 5], [1, 0]]],
					[new Vector2(6, -6), [[0, 5], [1, 0]]]
				],
				[
					new Vector2(-14, -11),
					new Vector2(-4, -11),
					new Vector2(-14, -6),
					new Vector2(-4, -6),
					new Vector2(6, -6),
				]
			],
			[
				["B", ["Nand-0", 'b'], ["And-0", 'b'], ["Or-0", 'b'], ["Nor-0", 'b'], ["Xor-0", 'b'], ["Xnor-0", 'b'], ["Not", 'a']],
				[
					[new Vector2(-15, -9), [[20, 0]]],
					[new Vector2(-15, -9), [[0, 5], [2, 0]]],
					[new Vector2(-5, -9), [[0, 5], [2, 0]]],
					[new Vector2(5, -9), [[0, 5], [2, 0]]],
					[new Vector2(-15, -4), [[0, 5], [2, 0]]],
					[new Vector2(-5, -4), [[0, 5], [2, 0]]],
					[new Vector2(5, -4), [[0, 5], [2, 0]]],
					[new Vector2(-15, 1), [[0, 4], [2, 0]]]
				],
				[
					new Vector2(-15, -9),
					new Vector2(-5, -9),
					new Vector2(-15, -4),
					new Vector2(-15, 1),
					new Vector2(-5, -4),
					new Vector2(5, -4),
				]
			]
		],
		createSignal(40),
		createSignal(new Vector2(0, 5)),
		'components-demo'
	));
	logic_circuit.init_view(view);
	yield* all(...logic_circuit.animate_changes([["A", true], ["B", false]], 0.2, 2));
	yield* waitFor(1);
	yield* all(...logic_circuit.animate_changes([["B", true]], 0.2, 2));
	yield* waitFor(1);
	yield* all(...logic_circuit.animate_changes([["A", false]], 0.2, 2));
	yield* waitFor(1);
	yield* all(...logic_circuit.animate_changes([["B", false]], 0.2, 2));
	yield* waitFor(1);
	yield* beginSlide('Logic gates');
	logic_circuit.remove();
	// Chip layout circuit alongside actual photo
	current_slide_title('What do they actually look like? Example quad AND gate chip');
	slide_ref = createRef<Rect>();
	let circuit_container = createRef<Rect>();
	view.add(
		<Rect ref={slide_ref} topLeft={generic_slide_top_left_pos} width={half_width*1.8} height={half_height*1.7}>
			<Img src={image_quad_and} maxHeight={half_height*0.6} maxWidth={half_width*0.8} position={new Vector2(0, -half_height*0.5)} />
			<Rect ref={circuit_container} position={new Vector2(0, half_height*0.3)} />
		</Rect>
	);
	let quad_and_circuit = new LogicCircuitToplevelWrapper(new LayoutQuadAnd(createSignal(20), createSignal(new Vector2(0, 0))));
	quad_and_circuit.init_view(circuit_container());
	yield* quad_and_circuit.animate_changes([], 0, 5);
	yield* beginSlide(current_slide_title());
	circuit_container().remove();
	slide_ref().remove();
	// Binary numbers, 0xNumbers
	current_slide_title('Binary numbers');
	slide_ref = createRef<Rect>();
	view.add(
		<Rect ref={slide_ref} justifyContent={'space-around'} layout topLeft={generic_slide_top_left_pos} width={half_width*1.8} height={half_height*1.7}>
			<Rect layout direction={'column'} width={half_width} justifyContent={'space-around'}>
				<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap>
					Made up of bits, a common length of 8 bits is a Byte.
				</Txt>
				<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap>
					A String of bits can be interpreted as a number. Instead of each place value being a power of 10, they are powers of 2.
				</Txt>
				<Rect layout direction={'column'}>
					<Img src={binary_decimal} width={half_width} alignSelf={'center'}></Img>
					<Txt fontSize={citation_text_size} fill={'#fff'} textAlign={'center'} textWrap>
						learningc.org/chapters/chapter01-computers/main-memory.html
					</Txt>
				</Rect>
			</Rect>
		</Rect>
	);
	yield* beginSlide(current_slide_title());
	slide_ref().remove();
	// Adder
	current_slide_title('Math (gross) with binary!');
	slide_ref = createRef<Rect>();
	circuit_container = createRef<Rect>();
	view.add(
		<Rect ref={slide_ref} topLeft={generic_slide_top_left_pos} width={half_width*1.8} height={half_height*1.7}>
			<Rect ref={circuit_container} position={new Vector2(0, 0)} />
		</Rect>
	);
	let adder_circuit = new LogicCircuitToplevelWrapper(FullAdder.create_internal_circuit(createSignal(30)));
	adder_circuit.init_view(circuit_container());
	yield* adder_circuit.animate_changes([], 0, 5);
	yield* adder_circuit.animate_changes([['A', true]], 0.2, 5);
	yield* waitFor(2);
	yield* adder_circuit.animate_changes([['B', true]], 0.2, 5);
	yield* waitFor(2);
	yield* adder_circuit.animate_changes([['Cin', true]], 0.2, 5);
	yield* waitFor(2);
	yield* adder_circuit.animate_changes([['A', false]], 0.2, 5);
	yield* waitFor(2);
	yield* adder_circuit.animate_changes([['B', false]], 0.2, 5);
	yield* waitFor(2);
	yield* adder_circuit.animate_changes([['Cin', false]], 0.2, 5);
	yield* waitFor(2);
	yield* beginSlide('Adder circuit intro');
	yield* adder_circuit.animate_changes([['A', false], ['B', false], ['Cin', false]], 0.2, 5);
	yield* waitFor(1);
	let new_adder_block = LogicDevice.create_circuit(new FullAdder(createSignal(new Vector2(0, 0))), createSignal(60));
	yield* adder_circuit.animate_swap_in_new_circuit(circuit_container(), new_adder_block, 2);
	yield* waitFor(2);
	yield* beginSlide('Adder block intro & A');
	yield* adder_circuit.animate_changes([['A', true]], 0.2, 3);
	yield* waitFor(2);
	yield* adder_circuit.animate_changes([['A', false]], 0.2, 3);
	yield* waitFor(0.6);
	yield* beginSlide('Adder intro B');
	yield* adder_circuit.animate_changes([['B', true]], 0.2, 3);
	yield* waitFor(2);
	yield* adder_circuit.animate_changes([['B', false]], 0.2, 3);
	yield* waitFor(0.6);
	yield* beginSlide('Adder intro Cin');
	yield* adder_circuit.animate_changes([['Cin', true]], 0.2, 3);
	yield* waitFor(2);
	yield* adder_circuit.animate_changes([['Cin', false]], 0.2, 3);
	yield* waitFor(0.6);
	yield* beginSlide('Adder A & B high');
	yield* adder_circuit.animate_changes([['A', true], ['B', true]], 0.2, 3);
	yield* waitFor(0.6);
	yield* beginSlide('Adder All inputs high');
	yield* adder_circuit.animate_changes([['A', true], ['B', true], ['Cin', true]], 0.2, 3);
	yield* waitFor(0.6);
	yield* beginSlide('Adder animate chain');
	current_slide_title('Not a Molecule');
	let parameterized_adder_internal = ParameterizedAdder.create_internal_circuit(8, createSignal(25));
	parameterized_adder_internal.position_grid(new Vector2(4, 0));
	yield* adder_circuit.animate_form_part_of_larger_circuit(parameterized_adder_internal, 'adder-0', 2);
	yield* adder_circuit.animate_changes([], 0, 10);
	yield* waitFor(2);
	yield* beginSlide('Adder chain A=4 + B=5');
	current_slide_title('Add 4 + 5');
	yield* adder_circuit.animate_changes([['A-2', true], ['B-2', true], ['B-0', true]], 0.2, 10);
	yield* waitFor(2);
	yield* beginSlide('Adder animate 8-bit block');
	current_slide_title('Better drawing');
	yield* adder_circuit.animate_swap_in_new_circuit(circuit_container(), LogicDevice.create_circuit(new ParameterizedAdderVertical(8, createSignal(new Vector2(0, 0))), createSignal(35)), 2);
	yield* adder_circuit.animate_changes([], 0, 10);
	yield* waitFor(2.5);
	yield* beginSlide('Sequential Logic');
	current_slide_title('Sequential Logic, NOR Flip Flop');
	circuit_container().remove();
	slide_ref().remove();
	// Sequential logic, Flip Flop, Epic animation sequence
	let sequencial_logic_wrapper = new LogicCircuitToplevelWrapper(create_nor_flip_flop(createSignal(60)));
	sequencial_logic_wrapper.init_view(view);
	yield* sequencial_logic_wrapper.animate_changes([['In-0', true]], 0.2, 3);
	yield* waitFor(2);
	yield* sequencial_logic_wrapper.animate_changes([['In-0', false]], 0.2, 3);
	yield* waitFor(0.6);
	yield* beginSlide('Sequential Logic same input, different state');
	yield* sequencial_logic_wrapper.animate_changes([['In-1', true]], 0.2, 3);
	yield* waitFor(2);
	yield* sequencial_logic_wrapper.animate_changes([['In-1', false]], 0.2, 3);
	yield* waitFor(0.6);
	yield* beginSlide('Powering on the flip flop');
	bottom_text('*Almost physically accurate');
	current_slide_title('What if its not in either state?');
	yield* sequencial_logic_wrapper.animate_changes([['In-0', true], ['In-1', true]], 0.2, 10);
	yield* waitFor(2);
	yield* sequencial_logic_wrapper.animate_changes([['In-0', false], ['In-1', false]], 0.2, 75);
	yield* waitFor(15);
	yield* beginSlide('Animate Data Latch');
	bottom_text('');
	sequencial_logic_wrapper.animate_changes([['In-0', true]], 0, 5);// Undo the race condition
	current_slide_title('Data Latch');
	let d_latch = DLatchEdge.create_internal_circuit(createSignal(40));
	yield* sequencial_logic_wrapper.animate_form_part_of_larger_circuit(d_latch, 'ff', 2);
	yield* sequencial_logic_wrapper.animate_changes([["CLK", false], ['D', false]], 0, 5);
	yield* waitFor(2);
	yield* beginSlide('Data Latch, highlight selector');
	yield* sequencial_logic_wrapper.animate_highlight_components(['not', 'and-0', 'and-1'], 0.2);
	yield* waitFor(0.2);
	yield* beginSlide('Data Latch, explain selector');
	yield* sequencial_logic_wrapper.animate_changes([['D', true]], 0.2, 5);
	yield* waitFor(2);
	yield* sequencial_logic_wrapper.animate_changes([['D', false]], 0.2, 5);
	yield* waitFor(2);
	yield* sequencial_logic_wrapper.animate_changes([['D', true]], 0.2, 5);
	yield* waitFor(2);
	yield* sequencial_logic_wrapper.animate_changes([['D', false]], 0.2, 5);
	yield* waitFor(1);
	yield* beginSlide('Data Latch, highlight edge trigger');
	yield* sequencial_logic_wrapper.animate_highlight_components(['not', 'and-0', 'and-1'], 0.2, new Color('#FFF'));
	yield* sequencial_logic_wrapper.animate_highlight_components(['edge-not', 'edge-and'], 0.2);
	yield* waitFor(0.2);
	yield* beginSlide('Data Latch, explain edge trigger');
	yield* waitFor(0.5);
	yield* sequencial_logic_wrapper.animate_changes([['CLK', true]], 0.2, 5);
	yield* waitFor(1);
	yield* sequencial_logic_wrapper.animate_changes([['CLK', false]], 0.2, 5);
	yield* waitFor(1);
	yield* sequencial_logic_wrapper.animate_changes([['CLK', true]], 0.2, 5);
	yield* waitFor(1);
	yield* sequencial_logic_wrapper.animate_changes([['CLK', false], ['D', true]], 0.2, 5);
	yield* waitFor(1);
	yield* beginSlide('Data Latch, slow edge trigger');
	bottom_text('*Almost physically accurate');
	yield* waitFor(0.5);
	yield* sequencial_logic_wrapper.animate_changes([['CLK', true]], 0.3, 1);
	yield* waitFor(0.3);
	yield* beginSlide('Data Latch, slow edge trigger up');
	yield* sequencial_logic_wrapper.animate_changes([], 0.3, 1);
	yield* waitFor(0.3);
	yield* beginSlide('Data Latch, slow edge trigger done, now to set ff');
	yield* sequencial_logic_wrapper.animate_changes([], 0.3, 2);
	yield* waitFor(0.6);
	yield* beginSlide('Data Latch, full demo');
	yield* sequencial_logic_wrapper.animate_highlight_components(['edge-not', 'edge-and'], 0.2, new Color('#FFF'));
	bottom_text('');
	yield* waitFor(0.5);
	yield* sequencial_logic_wrapper.animate_changes([['CLK', false]], 0.2, 5);
	yield* waitFor(1);
	yield* sequencial_logic_wrapper.animate_changes([['D', true]], 0.1, 5);
	yield* waitFor(2);
	yield* sequencial_logic_wrapper.animate_changes([['CLK', true]], 0.1, 5);
	yield* waitFor(2);
	yield* sequencial_logic_wrapper.animate_changes([['D', false]], 0.1, 5);
	yield* waitFor(1);
	yield* sequencial_logic_wrapper.animate_changes([['D', true]], 0.1, 5);
	yield* waitFor(1);
	yield* sequencial_logic_wrapper.animate_changes([['CLK', false]], 0.1, 5);
	yield* waitFor(2);
	yield* sequencial_logic_wrapper.animate_changes([['D', false]], 0.1, 5);
	yield* waitFor(2);
	yield* sequencial_logic_wrapper.animate_changes([['CLK', true]], 0.1, 5);
	yield* waitFor(1);
	yield* sequencial_logic_wrapper.animate_changes([['CLK', false]], 0.1, 5);
	yield* waitFor(1);
	yield* beginSlide('Data Latch, animate to block');
	// Swap with other latch graphic
	let new_latch_circuit = LogicDevice.create_circuit(new DLatchEdge(createSignal(new Vector2(0, 0)), 'latch'), createSignal(40));
	yield* sequencial_logic_wrapper.animate_swap_in_new_circuit(view, new_latch_circuit, 2);
	yield* waitFor(2);
	yield* beginSlide('Data Latch, animate to 8 bit');
	// 8 Bit latch
	let byte_latch_grid_signal = createSignal(18);
	let byte_latch = DLatchEdge8Bit.create_internal_circuit(byte_latch_grid_signal);
	yield* sequencial_logic_wrapper.animate_form_part_of_larger_circuit(byte_latch, 'latch-0', 2);
	yield* waitFor(2);
	yield* sequencial_logic_wrapper.animate_changes([[`OE`, true]], 0.2, 5);
	yield* waitFor(0.5);
	// Demo
	for(let i = 0; i < 8; i++) {
		yield* sequencial_logic_wrapper.animate_changes([[`D${i}`, true]], 0, 5);
		yield* waitFor(0.2);
		yield* sequencial_logic_wrapper.animate_changes([[`CLK`, true]], 0, 5);
		yield* waitFor(0.2);
		yield* sequencial_logic_wrapper.animate_changes([[`CLK`, false]], 0, 5);
		yield* waitFor(0.2);
	}
	yield* sequencial_logic_wrapper.animate_changes([[`OE`, false]], 0.1, 5);
	yield* waitFor(1);
	yield* sequencial_logic_wrapper.animate_changes([[`OE`, true], [`CLK`, true]], 0.1, 5);
	yield* waitFor(0.5);
	let new_byte_latch_circuit = LogicDevice.create_circuit(new DLatchEdge8Bit(createSignal(new Vector2(-7, 0)), 'latch-8-bit'), createSignal(50));
	yield* sequencial_logic_wrapper.animate_swap_in_new_circuit(view, new_byte_latch_circuit, 2);
	yield* sequencial_logic_wrapper.animate_changes([], 0, 5);
	let ref_8_bit_latch = createRef<Img>();
	view.add(<Img ref={ref_8_bit_latch} src={image_8_bit_latch} position={new Vector2(half_width*1.5, 0)} width={half_height*1.3} height={half_width*0.32} rotation={90}/>);
	yield* ref_8_bit_latch().position.x(half_width*0.3, 2);
	bottom_text('I used 51 of these in the computer');
	yield* waitFor(2);
	yield* beginSlide('Byte Latch');
	bottom_text('');
	ref_8_bit_latch().remove();
	sequencial_logic_wrapper.remove();
	// Clock & sequencers
	current_slide_title('Clock Signal & Timing');
	let sequencer = new LogicCircuitToplevelWrapper(create_sequencer_6(createSignal(25)));
	sequencer.init_view(view);
	yield* sequencer.animate_changes([], 0, 10);
	for(let i = 0; i < 8; i++) {
		yield* sequencer.animate_changes([['CLK', true]], 0.1, 5);
		yield* waitFor(0.5);
		yield* sequencer.animate_changes([['CLK', false]], 0.1, 5);
		yield* waitFor(0.5);
	}
	yield* beginSlide('Timing, show photo of actual starter');
	let ref_starter_photo = createRef<Img>();
	view.add(<Img ref={ref_starter_photo} src={image_starter} position={new Vector2(-half_width*0.7, -half_height*1.5)} width={half_width*0.3} height={half_height*0.84}/>);
	yield* all(ref_starter_photo().position.y(-half_height*0.3, 1), sequencer.rect_ref().position.y(half_height*0.4, 1));
	yield* waitFor(1);
	yield* beginSlide('Timing, run sequencer correctly');
	yield* all(ref_starter_photo().position.y(-half_height*1.5, 1), sequencer.rect_ref().position.y(DEFAULT, 1));
	yield* waitFor(1);
	ref_starter_photo().remove();
	yield* sequencer.animate_changes([['Start', true]], 0.2, 5);
	yield* waitFor(0.5);
	yield* sequencer.animate_changes([['CLK', true]], 0.2, 5);
	yield* waitFor(0.5);
	yield* sequencer.animate_changes([['Start', false]], 0.2, 5);
	yield* waitFor(0.5);
	yield* sequencer.animate_changes([['CLK', false]], 0.2, 5);
	yield* waitFor(0.5);
	for(let i = 0; i < 18; i++) {
		yield* sequencer.animate_changes([['CLK', true]], 0.1, 5);
		yield* waitFor(0.5);
		yield* sequencer.animate_changes([['CLK', false]], 0.1, 5);
		yield* waitFor(0.5);
	}
	// ------ Design & Build ------
	yield* beginSlide('Design & build');
	sequencer.remove();
	current_slide_title('My actual design (Lucidchart screenshot from ~1 Year ago)');
	let highlight_rectangle = createRef<Rect>();
	slide_ref = createRef<Rect>();
	view.add(
		<Rect ref={slide_ref} topLeft={generic_slide_top_left_pos} width={half_width*1.8} height={half_height*1.7}>
			<Img src={image_main_block_diagram} width={half_width*2} height={half_height*0.9} />
			<Rect ref={highlight_rectangle} stroke={'#F00'} lineWidth={3} opacity={0} />
		</Rect>
	);
	yield* beginSlide('Show bus');
	bottom_text('Main bus - group of 8 wires that connects everything')
	yield* all(
		highlight_rectangle().opacity(1, 1),
		highlight_rectangle().width(half_width*1.7, 1),
		highlight_rectangle().height(half_height*0.07, 1),
		highlight_rectangle().position(new Vector2(half_width*0.15, -half_height*0.41), 1)
	);
	yield* beginSlide('Show I/O');
	bottom_text('Input & Output - Similar to Arduino pins, eventually used for display');
	yield* all(
		highlight_rectangle().width(half_width*0.25, 1),
		highlight_rectangle().height(half_height*0.18, 1),
		highlight_rectangle().position(new Vector2(half_width*0.9, -half_height*0.23), 1)
	);
	yield* beginSlide('Show GPRAM');
	bottom_text('General Purpose Memory, 64 kB');
	yield* all(
		highlight_rectangle().width(half_width*0.25, 1),
		highlight_rectangle().height(half_height*0.18, 1),
		highlight_rectangle().position(new Vector2(half_width*0.6, -half_height*0.23), 1)
	);
	yield* beginSlide('Show ALU');
	bottom_text('ALU - Arithmetic Logic Unit (does math)');
	yield* all(
		highlight_rectangle().width(half_width*0.25, 1),
		highlight_rectangle().height(half_height*0.18, 1),
		highlight_rectangle().position(new Vector2(half_width*0.3, -half_height*0.23), 1)
	);
	yield* beginSlide('Show Stack');
	bottom_text('Stack - Special piece of memory');
	yield* all(
		highlight_rectangle().width(half_width*0.25, 1),
		highlight_rectangle().height(half_height*0.18, 1),
		highlight_rectangle().position(new Vector2(0, -half_height*0.23), 1)
	);
	yield* beginSlide('Show Clock');
	bottom_text('Clock - Generates the clock signal and has a counter');
	yield* all(
		highlight_rectangle().width(half_width*0.25, 1),
		highlight_rectangle().height(half_height*0.18, 1),
		highlight_rectangle().position(new Vector2(-half_width*0.29, -half_height*0.23), 1)
	);
	yield* beginSlide('Show Ctrl unit');
	bottom_text('Control unit - Decodes instructions, Responsible for most timing');
	yield* all(
		highlight_rectangle().width(half_width*0.25, 1),
		highlight_rectangle().height(half_height*0.18, 1),
		highlight_rectangle().position(new Vector2(-half_width*0.59, -half_height*0.23), 1)
	);
	yield* beginSlide('Show call stack');
	bottom_text('Call Stack - More memory - Returning from function calls');
	yield* all(
		highlight_rectangle().width(half_width*0.25, 1),
		highlight_rectangle().height(half_height*0.18, 1),
		highlight_rectangle().position(new Vector2(-half_width*0.89, -half_height*0.23), 1)
	);
	yield* beginSlide('Show bus addressing');
	bottom_text('Bus Read/Write addressing - Controls what sets the bus state and when');
	yield* all(// TODO
		highlight_rectangle().width(half_width*0.25, 1),
		highlight_rectangle().height(half_height*0.18, 1),
		highlight_rectangle().position(new Vector2(-half_width*0.89, -half_height*0.23), 1)
	);
	yield* beginSlide('Block diagram end placeholder');
	slide_ref().remove();
	// Instruction format graphic
	// Screenshot of actual CircuitVerse sequencer, explain how its like a baton in a relay race
	// Computer animation
	yield* beginSlide('Computer animation');
	const machine = new Emulator(new Uint16Array([0,0,0,0,0,0]), view);
	yield* machine.test_animation_1();
	yield* machine.test_animation_2(view);
	// Testing
	/*const myCircle = createRef<Circle>();
	view.add(
		<Rect>
			<Circle
				ref={myCircle}
				// try changing these properties:
				x={-960}
				y={-540}
				width={140}
				height={140}
				fill="#e13238"
			/>
		</Rect>
	);

	yield* all(
		myCircle().position.x(960, 1).to(-960, 1),
		myCircle().fill('#e6a700', 1).to('#e13238', 1),
	);*/

});

class Emulator {
	// Object refernces
	prog: Uint16Array<ArrayBufferLike>;
	layout: Reference<Layout>;
	test_circle: Reference<Circle>;
	// Signals
	program_counter: Signal<number, 0>;
	test_signal: SimpleSignal<number>;
	// Sub components
	alu: ALU;
	stack: Stack;
	gpram: GPRAM;
	call_stack: CallStack;
	// Mic
	value_font_size: number;
	title_font_size: number;
	// Methods
	constructor(prog: Uint16Array, view: View2D) {
		this.value_font_size = 20;
		this.title_font_size = 30;
		this.prog = prog;
		this.layout = createRef<Layout>();
		this.test_circle = createRef<Circle>();
		this.test_signal = createSignal(50);
		// Init sub-components
		this.alu = new ALU(this.value_font_size, this.title_font_size);
		this.stack = new Stack(this.value_font_size, this.title_font_size);
		this.gpram = new GPRAM(this.value_font_size, this.title_font_size);
		this.call_stack = new CallStack(this.value_font_size, this.title_font_size);
		// Add graphics
		view.add(
			<Rect
				layout
				ref={this.layout}
				grow={1}
				fill={'#000'}
				radius={2}
				stroke={'#fff'}
				lineWidth={2}
				margin={2}
				padding={10}
				zIndex={1}
			>
				{/*this.call_stack.init_rect(view)*/}
				{this.gpram.init_rect(view)}
				{this.stack.init_rect(view)}
				{this.alu.init_rect()}
			</Rect>
		);
		// Secondary things that require the layout to be done first
		//this.call_stack.memory_container.set_value_base_position();
		this.gpram.memory_container.set_value_base_position();
		this.stack.memory_container.set_value_base_position();
	}
	test_animation_1() {
		return this.stack.memory_container.animate_write_value(42, 1);
		//return this.stack.memory_container.data_display[5].position.y(0, 2);
		//return all(...this.stack.memory_container.animate_address_shift(1, 1));
	}
	test_animation_2(view: View2D) {
		return all(...this.stack.memory_container.animate_address_shift(view, 50, 3));
	}
}

class ALU {
	a: SimpleSignal<number>;
	b: SimpleSignal<number>;
	c: SimpleSignal<number>;
	value_font_size: number;
	title_font_size: number;
	constructor(value_font_size: number, title_font_size: number) {
		this.value_font_size = value_font_size;
		this.title_font_size = title_font_size;
		this.a = createSignal(0);
		this.b = createSignal(0);
		this.c = createSignal(0);
	}
	init_rect() {
		return <Rect
			layout
			grow={1}
			fill={'#000'}
			radius={2}
			stroke={'#fff'}
			lineWidth={2}
			margin={2}
			padding={10}
			direction={'column'}
		>
			<Txt
				text={() => `ALU`}
				fill={'#FFFFFF'}
				fontFamily={'Vera Mono'}
				fontSize={this.title_font_size}
				textAlign={'center'}
			/>
			<Txt
				text={() => `a = 0x${this.a().toString(16).padStart(2, '0')}`}
				fill={'#FFFFFF'}
				fontFamily={'Vera Mono'}
				fontSize={this.value_font_size}
			/>
			<Txt
				text={() => `b = 0x${this.b().toString(16).padStart(2, '0')}`}
				fill={'#FFFFFF'}
				fontFamily={'Vera Mono'}
				fontSize={this.value_font_size}
			/>
			<Txt
				text={() => `c = 0x${this.c().toString(16).padStart(2, '0')}`}
				fill={'#FFFFFF'}
				fontFamily={'Vera Mono'}
				fontSize={this.value_font_size}
			/>
		</Rect>;
	}
}

class Stack {
	tos: SimpleSignal<number>;
	offset: SimpleSignal<number>;
	data: Array<MemoryValue>;
	items_rect: Reference<Rect>;
	value_font_size: number;
	title_font_size: number;
	memory_container: MemoryContainer;
	constructor(value_font_size: number, title_font_size: number) {
		this.value_font_size = value_font_size;
		this.title_font_size = title_font_size;
		this.tos = createSignal(0);
		this.offset = createSignal(0);
		this.items_rect = createRef<Rect>();
		this.memory_container = new MemoryContainer(value_font_size, title_font_size, 2, 4);
	}
	init_rect(view: View2D) {
		let return_rect = <Rect
			layout
			grow={1}
			fill={'#000'}
			radius={2}
			stroke={'#fff'}
			lineWidth={2}
			margin={2}
			padding={10}
			direction={'column'}
		>
			<Txt
				text={() => `Stack Memory`}
				fill={'#FFFFFF'}
				fontFamily={'Vera Mono'}
				fontSize={this.title_font_size}
				textAlign={'center'}
			/>
			<Rect
				layout
				  grow={1}
				fill={'#000'}
				margin={0}
				padding={0}
			>
				<Rect
					layout
					  grow={1}
					fill={'#000'}
					margin={0}
					padding={0}
					direction={'column'}
				>
					<Txt
						text={() => `ToS = 0x${this.tos().toString(16).padStart(4, '0')}`}
						fill={'#FFFFFF'}
						fontFamily={'Vera Mono'}
						fontSize={this.value_font_size}
						textAlign={'right'}
					/>
					<Txt
						text={() => `Offset = 0x${this.offset().toString(16).padStart(2, '0')}`}
						fill={'#FFFFFF'}
						fontFamily={'Vera Mono'}
						fontSize={this.value_font_size}
						textAlign={'right'}
					/>
				</Rect>
				{this.memory_container.init_rect(view)}
			</Rect>
		</Rect>;
		// Add initial stack values (wrap around to 65,535)
		/*for(let i = 0; i < 10; i++) {
			let new_stack_value = new MemoryValue(0, 65535-i, 2, 4, this.value_font_size, this.title_font_size);
			this.data.push(new_stack_value);
			this.items_rect().add(new_stack_value.init_rect());
		}*/
		return return_rect;
	}
}

class GPRAM {
	address: SimpleSignal<number>;
	color_addr_a: SimpleSignal<Color>;
	color_addr_b: SimpleSignal<Color>;
	memory_container: MemoryContainer;
	value_font_size: number;
	title_font_size: number;
	constructor(value_font_size: number, title_font_size: number) {
		this.value_font_size = value_font_size;
		this.title_font_size = title_font_size;
		this.address = createSignal(0);
		this.color_addr_a = createSignal(new Color('#FFF'));
		this.color_addr_b = createSignal(new Color('#FFF'));
		this.memory_container = new MemoryContainer(value_font_size, title_font_size, 2, 4);
	}
	init_rect(view: View2D) {
		let return_rect = <Rect
			layout
			  grow={1}
			fill={'#000'}
			radius={2}
			stroke={'#fff'}
			lineWidth={2}
			margin={2}
			padding={10}
			direction={'column'}
		>
			<Txt
				text={() => `General Purpose RAM`}
				fill={'#FFFFFF'}
				fontFamily={'Vera Mono'}
				fontSize={this.title_font_size}
				textAlign={'center'}
			/>
			<Rect
				layout
				  grow={1}
				fill={'#000'}
				margin={0}
				padding={0}
			>
				<Rect
					layout
					  grow={1}
					fill={'#000'}
					margin={0}
					padding={0}
				>
					<Txt
						text={'Address = 0x'}
						fill={'#FFFFFF'}
						fontFamily={'Vera Mono'}
						fontSize={this.value_font_size}
						textAlign={'right'}
					/>
					<Txt
						text={this.address().toString(16).padStart(4, '0').slice(0, 2)}
						fill={this.color_addr_b}
						fontFamily={'Vera Mono'}
						fontSize={this.value_font_size}
						textAlign={'right'}
					/>
					<Txt
						text={this.address().toString(16).padStart(4, '0').slice(2)}
						fill={this.color_addr_a}
						fontFamily={'Vera Mono'}
						fontSize={this.value_font_size}
						textAlign={'right'}
					/>
				</Rect>
				{this.memory_container.init_rect(view)}
			</Rect>
		</Rect>;
		return return_rect;
	}
}

class CallStack {
	color_tos: SimpleSignal<Color>;
	tos: SimpleSignal<number>;
	memory_container: MemoryContainer;
	value_font_size: number;
	title_font_size: number;
	constructor(value_font_size: number, title_font_size: number) {
		this.value_font_size = value_font_size;
		this.title_font_size = title_font_size;
		this.color_tos = createSignal(new Color('#FFF'));
		this.tos = createSignal(0);
		this.memory_container = new MemoryContainer(value_font_size, title_font_size, 4, 2);
	}
	init_rect(view: View2D) {
		let return_rect = <Rect
			layout
			grow={1}
			fill={'#000'}
			radius={2}
			stroke={'#fff'}
			lineWidth={2}
			margin={2}
			padding={10}
			direction={'column'}
		>
			<Txt
				text={() => `Call Stack`}
				fill={'#FFFFFF'}
				fontFamily={'Vera Mono'}
				fontSize={this.title_font_size}
				textAlign={'center'}
			/>
			<Rect
				layout
				  grow={1}
				fill={'#000'}
				margin={0}
				padding={0}
			>
				<Txt
					text={'ToS = 0x'}
					fill={'#FFFFFF'}
					fontFamily={'Vera Mono'}
					fontSize={this.value_font_size}
					textAlign={'right'}
				/>
				<Txt
					text={this.tos().toString(16).padStart(2, '0')}
					fill={this.color_tos}
					fontFamily={'Vera Mono'}
					fontSize={this.value_font_size}
					textAlign={'right'}
				/>
				{this.memory_container.init_rect(view)}
			</Rect>
		</Rect>;
		return return_rect;
	}
}