import {Circle, Layout, makeScene2D, Rect, View2D, Txt, Img, Code, vector2Signal, Line, CircleSegment} from '@motion-canvas/2d';
import {all, beginSlide, waitFor, createRef, Reference, Signal, SimpleSignal, createSignal, DEFAULT, Color, Vector2Signal, Vector2, SignalTween, SimpleVector2Signal, useLogger, easeInOutCubic, SignalGenerator, delay, easeInCubic, easeOutCubic, linear} from '@motion-canvas/core';
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
import image_sram_top_down from '../../images/sram_top_down.jpeg';
import image_bus_sources from '../../images/scrot_bus_sources.png';
import image_bus_dests from '../../images/scrot_bus_dests.png';
import image_cv_everything from '../../images/cv_everything.png';
import image_cv_sequencer from '../../images/actual_sequencer_cv.png';
import image_cv_timing_diagram from '../../images/cv_timing_diagram.png';
import image_wavedrom_main_cycle from '../../images/wavedrom_main_cycle.png';
import image_wavedrom_start from '../../images/wavedrom_start_timing.png';
import { LogicDevice, LogicCircuit, LogicCircuitToplevelWrapper, GateAnd, GateNand, GateOr, GateNor, GateXor, GateXnor, GateNot, LogicConnectionPin } from '../logic_sim';
import { create_nor_flip_flop, create_d_level_latch, DLatchEdge, DLatchEdge8Bit, LayoutQuadAnd, FullAdder, ParameterizedAdder, ParameterizedAdderHorizontal, ParameterizedAdderVertical, create_sequencer_6 } from '../derived_circuits';

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

const written_to_color = new Color('#FF0000');
const read_from_color = new Color('#00FF00');

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
		zIndex={5}
	/>);
	let bottom_text_ref = createRef<Txt>();
	let bottom_text: SimpleSignal<string> = createSignal('');
	view.add(<Txt text={bottom_text} ref={bottom_text_ref} fontSize={slide_title_text_size} fill={'#FFF'} textAlign={'center'} position={new Vector2(0, half_height*0.85)} zIndex={5} />);
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
	sequencial_logic_wrapper.rect_ref().zIndex(2);
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
	yield* beginSlide('Byte Latch zoom out & replace with memory');
	yield* all(
		ref_8_bit_latch().position.x(half_width*1.5, 0.5),
		sequencial_logic_wrapper.rect_ref().position.x(0, 0.5)
	);
	yield* waitFor(0.5);
	bottom_text('x32,768');
	current_slide_title('Static Random Access Memory (SRAM), 32 kB');
	let ref_mem_photo = createRef<Img>();
	view.add(<Img ref={ref_mem_photo} src={image_sram_top_down} position={new Vector2(0, 0)} width={half_width*1.7} height={half_height*1.3} opacity={0} scale={10}/>);
	yield* all(
		ref_mem_photo().opacity(1, 2),
		ref_mem_photo().scale(1, 2, easeOutCubic),
		sequencial_logic_wrapper.rect_ref().scale(0, 2, easeOutCubic)
	);
	yield* waitFor(2);
	yield* beginSlide('End of latch & memory');
	bottom_text('');
	ref_8_bit_latch().remove();
	ref_mem_photo().remove();
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
	yield* all(
		highlight_rectangle().width(half_width*1.5, 1),
		highlight_rectangle().height(half_height*0.5, 1),
		highlight_rectangle().position(new Vector2(-half_width*0, half_height*0.2), 1)
	);
	// Instruction format graphic
	yield* beginSlide('Block diagram end, show instruction format graphic, MOVE');
	slide_ref().remove();
	bottom_text('');
	current_slide_title('Instruction format, 16 bits');
	let instruction_demo = new InstructionFormatDemo(createSignal(20), createSignal(new Vector2(0, -half_height*0.5)), view);
	let move_addresses_ref = createRef<Rect>();
	view.add(<Rect
		ref={move_addresses_ref}
		position={new Vector2(0, half_height*0.3)}
	>
		<Img src={image_bus_sources} height={half_height*0.81} width={half_width*0.7} position={new Vector2(-half_width*0.6, 0)} />
		<Img src={image_bus_dests} height={half_height*1.08} width={half_width} position={new Vector2(half_width*0.4, 0)} />
	</Rect>);
	yield* beginSlide('Instruction WRITE');
	instruction_demo.set_instruction(1);
	yield* beginSlide('Instruction GOTO');
	instruction_demo.set_instruction(2);
	yield* all(
		move_addresses_ref().position.y(half_height*2, 1),
		instruction_demo.position_px(new Vector2(0, 0), 1)
	);
	yield* beginSlide('Instruction GOTO-IF');
	instruction_demo.set_instruction(3);
	yield* beginSlide('Instruction HALT');
	instruction_demo.set_instruction(4);
	yield* beginSlide('Instruction CALL');
	instruction_demo.set_instruction(5);
	yield* beginSlide('Instruction RETURN');
	instruction_demo.set_instruction(6);
	yield* beginSlide('End');
	/*instruction_demo.rect_ref().remove();
	current_slide_title('Designing it in CircuitVerse');
	slide_ref = createRef<Rect>();
	view.add(
		<Rect ref={slide_ref} topLeft={generic_slide_top_left_pos} width={half_width*1.8} height={half_height*1.7}>
			<Img src={image_cv_everything} width={half_width*2} height={half_height*1.4} position={new Vector2(0, 0)} />
		</Rect>
	);
	yield* beginSlide(current_slide_title());
	slide_ref().remove();
	current_slide_title('Timing');
	slide_ref = createRef<Rect>();
	view.add(
		<Rect ref={slide_ref} topLeft={generic_slide_top_left_pos} width={half_width*1.8} height={half_height*1.7}>
			<Img src={image_cv_sequencer} width={half_width*1.8} height={half_height*1.3} position={new Vector2(-half_width*0.1, half_height*0.2)} />
			<Img src={image_wavedrom_main_cycle} width={half_width*0.8} height={half_height*0.9} position={new Vector2(half_width*0.5, -half_height*0.6)} />
		</Rect>
	);
	yield* beginSlide(current_slide_title());
	slide_ref().remove();
	yield* beginSlide('End placeholder');
	// Screenshot of actual CircuitVerse sequencer, explain how its like a baton in a relay race
	// Computer animation
	yield* beginSlide('Computer animation');
	const machine = new Emulator(
		[0,1,2,3,4,5,6],
		createSignal(20),
		createSignal(new Vector2(0, 0)),
		view
	);
	yield* beginSlide('Computer initiated');
	yield* machine.test_animation_1();
	yield* machine.test_animation_2(view);*/
	// Testing
});

class InstructionFormatDemo {
	instruction: SimpleSignal<number>;
	rect_ref: Reference<Rect>;
	instruction_ref: Reference<Txt>;
	segment_explainers: Array<[Reference<Txt>, Reference<Line>]>;
	grid_size: SimpleSignal<number>;
	position_px: SimpleSignal<Vector2>;
	explanation: SimpleSignal<string>;
	constructor(grid_size: SimpleSignal<number>, position_px: SimpleSignal<Vector2>, parent_rect: View2D | Rect) {
		this.instruction = createSignal(0);
		this.rect_ref = createRef<Rect>();
		this.instruction_ref = createRef<Txt>();
		this.segment_explainers = [];
		this.grid_size = grid_size;
		this.position_px = position_px;
		this.explanation = createSignal('');
		// Init view
		parent_rect.add(<Rect
			ref={this.rect_ref}
			position={this.position_px}
		>
			<Code
				ref={this.instruction_ref}
				position={() => new Vector2(0, -4).scale(this.grid_size())}
				fontSize={() => this.grid_size()*3}
				fill={'#FFF'}
				code={() => `${this.instruction().toString(2).padStart(16, '0')}`}
			/>
			<Txt
				text={this.explanation}
				position={() => new Vector2(0, 4).scale(this.grid_size())}
				fill={'#FFF'}
				fontSize={() => this.grid_size()*2}
			/>
		</Rect>);
		// Set instruction
		this.set_instruction(0);
	}
	set_instruction(instruction: number) {
		this.instruction(instruction);
		// Remove old explainers
		for(let i = 0; i < this.segment_explainers.length; i++) {
			this.segment_explainers[i][0]().remove();
			this.segment_explainers[i][1]().remove();
		}
		this.segment_explainers = [];
		let opcode = instruction & 0xF;
		let opcode_str: string;
		let description: string;
		// Add new ones
		switch(opcode) {
			case 0:
				opcode_str = 'MOVE';
				description = 'Moves a byte on the bus from given source to destination';
				this.add_segment_explainer(4, 4, 'ALU OPCODE');
				this.add_segment_explainer(8, 4, 'SOURCE');
				this.add_segment_explainer(12, 4, 'DESTINATION');
				break;
			case 1:
				opcode_str = 'WRITE';
				description = 'Moves a byte from the same program instruction to something else on the bus';
				this.add_segment_explainer(4, 8, 'BYTE TO BE WRITTEN');
				this.add_segment_explainer(12, 4, 'DESTINATION');
				break;
			case 2:
				opcode_str = 'GOTO';
				description = 'Sets the Program Counter based on the values in the GOTO latches';
				this.add_segment_explainer(4, 12, 'UNUSED');
				break;
			case 3:
				opcode_str = 'GOTO-IF';
				description = 'Same as GOTO but ONLY if a bit called the Goto Decider is 1';
				this.add_segment_explainer(4, 12, 'UNUSED');
				break;
			case 4:
				opcode_str = 'HALT';
				description = 'Stops the clock';
				this.add_segment_explainer(4, 12, 'UNUSED');
				break;
			case 5:
				opcode_str = 'CALL';
				description = 'Similar to GOTO, first saves the return address to the Call Stack';
				this.add_segment_explainer(4, 12, 'UNUSED');
				break;
			case 6:
				opcode_str = 'RETURN';
				description = 'Opposite of CALL, sets the Program counter to the top of the Call Stack';
				this.add_segment_explainer(4, 12, 'UNUSED');
				break;
		}
		// Opcode segment explainer
		this.add_segment_explainer(0, 4, 'OPCODE');
		this.explanation(`Operation ${opcode} - ${opcode_str} - ${description}`);
	}
	add_segment_explainer(bit_start: number, len: number, text: string) {
		let new_line_ref = createRef<Line>();
		let new_txt_ref = createRef<Txt>();
		let instruction_char_width = 1.8;// Grid units
		this.rect_ref().add(<Line
			ref={new_line_ref}
			points={[
				() => new Vector2(-len-bit_start, -0.5).scale(instruction_char_width*this.grid_size()).add(this.instruction_ref().bottomRight()),
				() => new Vector2(-len-bit_start, 0).scale(instruction_char_width*this.grid_size()).add(this.instruction_ref().bottomRight()),
				() => new Vector2(-bit_start, 0).scale(instruction_char_width*this.grid_size()).add(this.instruction_ref().bottomRight()),
				() => new Vector2(-bit_start, -0.5).scale(instruction_char_width*this.grid_size()).add(this.instruction_ref().bottomRight())
			]}
			stroke={'#FFF'}
			lineWidth={2}
		/>);
		this.rect_ref().add(<Txt
			ref={new_txt_ref}
			fontSize={() => this.grid_size()}
			position={() => new Vector2(-bit_start-(len/2), 1).scale(instruction_char_width*this.grid_size()).add(this.instruction_ref().bottomRight())}
			text={text}
			fill={'#FFF'}
		/>);
		this.segment_explainers.push([new_txt_ref, new_line_ref]);
	}
}

class Emulator {
	// Object refernces
	rect_ref: Reference<Rect>;
	grid_size: SimpleSignal<number>;
	position_px: SimpleSignal<Vector2>;
	// Sub components
	prog: ProgramBox;
	alu: ALU;
	stack: Stack;
	gpram: GPRAM;
	call_stack: CallStack;
	// Mic
	value_font_size: number;
	title_font_size: number;
	// Methods
	constructor(prog: Array<number>, grid_size: SimpleSignal<number>, position_px: SimpleSignal<Vector2>, parent_rect: View2D | Rect) {
		this.value_font_size = 20;
		this.title_font_size = 30;
		this.rect_ref = createRef<Rect>();
		this.grid_size = grid_size;
		this.position_px = position_px;
		// Init sub-components
		this.prog = new ProgramBox(prog, grid_size, createSignal(new Vector2(-35, 0)));
		this.alu = new ALU(grid_size, createSignal(new Vector2(-10, -20)));
		this.stack = new Stack(grid_size, createSignal(new Vector2(-10, 10)));
		this.gpram = new GPRAM(grid_size, createSignal(new Vector2(20, -20)));
		this.call_stack = new CallStack(grid_size, createSignal(new Vector2(20, 10)));
		// Add graphics
		parent_rect.add(<Rect
			ref={this.rect_ref}
			position={this.position_px}
		/>);
		this.prog.init_view(this.rect_ref());
		this.alu.init_rect(this.rect_ref());
		this.stack.init_rect(this.rect_ref());
		this.gpram.init_rect(this.rect_ref());
		this.call_stack.init_rect(this.rect_ref());
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

class ProgramBox {
	static width_grid: number = 20;
	static height_grid: number = 40;
	prog_binary: Array<number>;
	prog_source: Array<string>;
	pc: SimpleSignal<number>;
	// Copy these three
	rect_ref: Reference<Rect>;
	grid_size: SimpleSignal<number>;
	position_grid: SimpleSignal<Vector2>;
	constructor(prog_binary: Array<number>, grid_size: SimpleSignal<number>, position_grid: SimpleSignal<Vector2>) {
		this.prog_binary = prog_binary;
		this.prog_source = [];
		// Decompile binary to source
		for(let i = 0; i < prog_binary.length; i++) {
			let keywords: Array<string> = [];
			let instruction = prog_binary[i];
			let opcode = instruction & 0xF;
			keywords.push(ProgramBox.decode_opcode(opcode));
			if(opcode == 0 || opcode == 1) {// MOVE or WRITE
				if(opcode == 0) {
					let source = (instruction >> 8) & 0xF;
					if(source == 2) {// ALU
						let alu_opcode = (instruction >> 4) & 0xF;
						keywords.push(ProgramBox.decode_alu_opcode(alu_opcode));
					}
					keywords.push(ProgramBox.decode_bus_source_address(source));
				}
				else {// WRITE
					let literal = (instruction >> 4) & 0xFF;
					keywords.push(`0x${literal.toString(16).padStart(2, '0')}`);
				}
				let dest = (instruction >> 12) & 0xF;
				keywords.push(ProgramBox.decode_bus_dest_address(dest));
			}
			this.prog_source.push(`${i}`.padStart(4, ' ') + ': ' + keywords.join(' ') + ';');
		}
		this.pc = createSignal(0);
		this.rect_ref = createRef<Rect>();
		this.grid_size = grid_size;
		this.position_grid = position_grid;
	}
	init_view(parent_rect: View2D | Rect) {
		parent_rect.add(
			<Rect
				position={this.position_grid().scale(this.grid_size())}
				width={() => this.grid_size() * ProgramBox.width_grid}
				height={() => this.grid_size() * ProgramBox.height_grid}
				radius={2}
				stroke={'#fff'}
				lineWidth={2}
				ref={this.rect_ref}
			>
				<Code
					fontSize={() => this.grid_size()}
					code={this.prog_source.join('\n')}
					topLeft={() => new Vector2(-11.5, -18).scale(this.grid_size())}
				/>
			</Rect>
		);
	}
	static decode_opcode(opcode: number): string {
		let codes = [
			'MOVE',
			'WRITE',
			'GOTO',
			'GOTO-IF',
			'HALT',
			'CALL',
			'RETURN'
		]
		if(opcode < codes.length) {
			return codes[opcode];
		}
		else {throw new Error(`Opcode ${opcode} is invalid`);}
	}
	static decode_bus_source_address(source: number): string {
		let sources = [
			'STACK-POP',
			'OFFSET-READ',
			'ALU',
			'',
			'GPRAM',
			'GPRAM-INC-ADDR',
			'GPRAM-ADDR-A',
			'GPRAM-ADDR-B',
			'GPIO-READ-A',
			'CLK-COUNTER-A',
			'CLK-COUNTER-B',
			'GPIO-READ-B'
		];
		if(source < sources.length) {
			if(source == 3) {
				throw new Error(`A MOVE must not use the program as a source, that is what WRITE is for`);
			}
			return sources[source];
		}
		else {throw new Error(`Bus write (source) address ${source} is invalid`);}
	}
	static decode_bus_dest_address(source: number): string {
		const sources = [
			'NONE',                // 0
			'STACK-PUSH',          // 1
			'ALU-A',               // 2
			'ALU-B',               // 3
			'GOTO-A',              // 4
			'GOTO-B',              // 5
			'GOTO-DECIDER',        // 6
			'GPRAM',               // 7
			'GPRAM-INC-ADDR',      // 8
			'GPRAM-ADDR-A',        // 9
			'GPRAM-ADDR-B',        // 10
			'GPIO-WRITE-A',        // 11
			'OFFSET-WRITE',        // 12
			'SET-STACK-OFFSET',    // 13
			'ALU-C-IN',            // 14
			'GPIO-WRITE-B'         // 15
		];
		if(source < sources.length) {
			return sources[source];
		}
		else {throw new Error(`Bus read (destination) address ${source} is invalid`);}
	}
	static decode_alu_opcode(source: number): string {
		const sources = [
			'ADD',
			'ADD-C',
			'NOT',
			'OR',
			'AND',
			'XNOR',
			'SHIFT',
			'EQ',
			'A',
			'B'
		];
		if(source < sources.length) {
			return sources[source];
		}
		else {throw new Error(`ALU opcode ${source} is invalid`);}
	}
}

class ALU {
	static width_grid: number = 10;
	static height_grid: number = 24;
	a: SimpleSignal<number>;
	b: SimpleSignal<number>;
	c: SimpleSignal<number>;
	opcode: SimpleSignal<number>;
	rect_ref: Reference<Rect>;
	grid_size: SimpleSignal<number>;
	position_grid: SimpleSignal<Vector2>;
	constructor(grid_size: SimpleSignal<number>, position_grid: SimpleSignal<Vector2>) {
		this.a = createSignal(0);
		this.b = createSignal(0);
		this.c = createSignal(0);
		this.opcode = createSignal(0);
		this.rect_ref = createRef<Rect>();
		this.rect_ref = createRef<Rect>();
		this.grid_size = grid_size;
		this.position_grid = position_grid;
	}
	init_rect(parent_rect: View2D | Rect) {
		parent_rect.add(<Rect
			ref={this.rect_ref}
			radius={2}
			stroke={'#fff'}
			lineWidth={2}
			position={this.position_grid().scale(this.grid_size())}
			width={() => this.grid_size() * ALU.width_grid}
			height={() => this.grid_size() * ALU.height_grid}
		>
			<Txt
				text={`ALU`}
				fill={'#FFFFFF'}
				fontFamily={'Vera Mono'}
				fontSize={this.grid_size}
				textAlign={'center'}
				position={() => new Vector2(0, -2.5*this.grid_size())}
			/>
			<Txt
				text={() => `a = 0x${this.a().toString().padStart(3, '0')}`}
				fill={'#FFFFFF'}
				fontFamily={'Vera Mono'}
				fontSize={this.grid_size}
				position={() => new Vector2(0, -1).scale(this.grid_size())}
			/>
			<Txt
				text={() => `b = 0x${this.b().toString().padStart(3, '0')}`}
				fill={'#FFFFFF'}
				fontFamily={'Vera Mono'}
				fontSize={this.grid_size}
				position={() => new Vector2(0, 0.5).scale(this.grid_size())}
			/>
			<Txt
				text={() => `c = 0x${this.c().toString().padStart(3, '0')}`}
				fill={'#FFFFFF'}
				fontFamily={'Vera Mono'}
				fontSize={this.grid_size}
				position={() => new Vector2(0, 2).scale(this.grid_size())}
			/>
		</Rect>);
	}
}

class Stack {
	static width_grid: number = 10;
	static height_grid: number = 24;
	tos: SimpleSignal<number>;
	offset: SimpleSignal<number>;
	data: Array<MemoryValue>;
	items_rect: Reference<Rect>;
	rect_ref: Reference<Rect>;
	grid_size: SimpleSignal<number>;
	position_grid: SimpleSignal<Vector2>;
	memory_container: MemoryContainer;
	constructor(grid_size: SimpleSignal<number>, position_grid: SimpleSignal<Vector2>) {
		this.tos = createSignal(0);
		this.offset = createSignal(0);
		this.items_rect = createRef<Rect>();
		this.rect_ref = createRef<Rect>();
		this.grid_size = grid_size;
		this.position_grid = position_grid;
		this.memory_container = new MemoryContainer(2, 4, grid_size, createSignal(new Vector2(0, 0)));
	}
	init_rect(parent_rect: View2D | Rect) {
		parent_rect.add(<Rect
			radius={2}
			stroke={'#fff'}
			lineWidth={2}
			ref={this.rect_ref}
			position={this.position_grid().scale(this.grid_size())}
			width={() => this.grid_size() * Stack.width_grid}
			height={() => this.grid_size() * Stack.height_grid}
		>
			<Txt
				text={() => `Stack Memory`}
				fill={'#FFFFFF'}
				fontFamily={'Vera Mono'}
				fontSize={this.grid_size}
				textAlign={'center'}
				position={() => new Vector2(0, -11.3).scale(this.grid_size())}
			/>
			<Txt
				text={() => `ToS = 0x${this.tos().toString(16).padStart(4, '0')}`}
				fill={'#FFFFFF'}
				fontFamily={'Vera Mono'}
				fontSize={this.grid_size}
				textAlign={'right'}
				position={() => new Vector2(0, -10.2).scale(this.grid_size())}
			/>
			<Txt
				text={() => `Offset = 0x${this.offset().toString(16).padStart(2, '0')}`}
				fill={'#FFFFFF'}
				fontFamily={'Vera Mono'}
				fontSize={this.grid_size}
				textAlign={'right'}
				position={() => new Vector2(0, -9.1).scale(this.grid_size())}
			/>
		</Rect>);
		// Add initial stack values (wrap around to 65,535)
		/*for(let i = 0; i < 10; i++) {
			let new_stack_value = new MemoryValue(0, 65535-i, 2, 4, this.value_font_size, this.title_font_size);
			this.data.push(new_stack_value);
			this.items_rect().add(new_stack_value.init_rect());
		}*/
		this.memory_container.init_rect(this.rect_ref());
	}
}

class GPRAM {
	static width_grid: number = 10;
	static height_grid: number = 24;
	address: SimpleSignal<number>;
	color_addr_a: SimpleSignal<Color>;
	color_addr_b: SimpleSignal<Color>;
	memory_container: MemoryContainer;
	rect_ref: Reference<Rect>;
	grid_size: SimpleSignal<number>;
	position_grid: SimpleSignal<Vector2>;
	constructor(grid_size: SimpleSignal<number>, position_grid: SimpleSignal<Vector2>) {
		this.address = createSignal(0);
		this.color_addr_a = createSignal(new Color('#FFF'));
		this.color_addr_b = createSignal(new Color('#FFF'));
		this.rect_ref = createRef<Rect>();
		this.grid_size = grid_size;
		this.position_grid = position_grid;
		this.memory_container = new MemoryContainer(2, 4, grid_size, createSignal(new Vector2(0, 0)));
	}
	init_rect(parent_rect: View2D | Rect) {
		parent_rect.add(<Rect
			radius={2}
			stroke={'#fff'}
			lineWidth={2}
			direction={'column'}
			ref={this.rect_ref}
			position={this.position_grid().scale(this.grid_size())}
			width={() => this.grid_size() * GPRAM.width_grid}
			height={() => this.grid_size() * GPRAM.height_grid}
		>
			<Txt
				text={() => `General Purpose RAM`}
				fill={'#FFFFFF'}
				fontFamily={'Vera Mono'}
				fontSize={this.grid_size}
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
						fontSize={this.grid_size}
						textAlign={'right'}
					/>
					<Txt
						text={this.address().toString(16).padStart(4, '0').slice(0, 2)}
						fill={this.color_addr_b}
						fontFamily={'Vera Mono'}
						fontSize={this.grid_size}
						textAlign={'right'}
					/>
					<Txt
						text={this.address().toString(16).padStart(4, '0').slice(2)}
						fill={this.color_addr_a}
						fontFamily={'Vera Mono'}
						fontSize={this.grid_size}
						textAlign={'right'}
					/>
				</Rect>
			</Rect>
		</Rect>);
		this.memory_container.init_rect(this.rect_ref());
	}
}

class CallStack {
	static width_grid: number = 10;
	static height_grid: number = 24;
	color_tos: SimpleSignal<Color>;
	tos: SimpleSignal<number>;
	memory_container: MemoryContainer;
	rect_ref: Reference<Rect>;
	grid_size: SimpleSignal<number>;
	position_grid: SimpleSignal<Vector2>;
	constructor(grid_size: SimpleSignal<number>, position_grid: SimpleSignal<Vector2>) {
		this.color_tos = createSignal(new Color('#FFF'));
		this.tos = createSignal(0);
		this.rect_ref = createRef<Rect>();
		this.grid_size = grid_size;
		this.position_grid = position_grid;
		this.memory_container = new MemoryContainer(4, 2, grid_size, createSignal(new Vector2(0, 0)));
	}
	init_rect(parent_rect: View2D | Rect) {
		parent_rect.add(<Rect
			ref={this.rect_ref}
			fill={'#000'}
			radius={2}
			stroke={'#fff'}
			lineWidth={2}
			direction={'column'}
			position={this.position_grid().scale(this.grid_size())}
			width={() => this.grid_size() * CallStack.width_grid}
			height={() => this.grid_size() * CallStack.height_grid}
		>
			<Txt
				text={() => `Call Stack`}
				fill={'#FFFFFF'}
				fontFamily={'Vera Mono'}
				fontSize={this.grid_size}
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
					fontSize={this.grid_size}
					textAlign={'right'}
				/>
				<Txt
					text={this.tos().toString(16).padStart(2, '0')}
					fill={this.color_tos}
					fontFamily={'Vera Mono'}
					fontSize={this.grid_size}
					textAlign={'right'}
				/>
			</Rect>
		</Rect>);
		this.memory_container.init_rect(this.rect_ref());
	}
}

class MemoryValue {
	static width_grid: number = 8;
	static height_grid: number = 2;
	n: SimpleSignal<number>;
	index: number;
	n_size_hex_digits: number;
	index_size_hex_digits: number;
	rect_ref: Reference<Rect>;
	grid_size: SimpleSignal<number>;
	position_px: SimpleSignal<Vector2>;
	txt_ref: Reference<Txt>;
	y_offset: SimpleSignal<number>;// For animating scrolling memory
	value_color: SimpleSignal<Color>;
	base_topleft_pos: () => Vector2;
	constructor(n: number, index: number, n_size_hex_digits: number, index_size_hex_digits: number, top_y_pos: number, grid_size: SimpleSignal<number>) {
		this.n_size_hex_digits = n_size_hex_digits;
		this.index_size_hex_digits = index_size_hex_digits;
		this.rect_ref = createRef<Rect>();
		this.grid_size = grid_size;
		this.txt_ref = createRef<Txt>();
		this.n = createSignal(n);
		this.index = index;
		this.y_offset = createSignal(top_y_pos);
		this.value_color = createSignal(new Color('FFF'));
		this.base_topleft_pos = () => {return new Vector2(0, 0);};
	}
	init_rect(parent_rect: View2D | Rect, n_display_values: number) {
		// base_pos_callback is the position of the top-left corner of the `MemoryContainer`s `items_rect` placeholder
		parent_rect.add(<Rect
			ref={this.rect_ref}
			topLeft={() => {return this.base_topleft_pos().add(new Vector2(15, this.y_offset()+5));}}
			zIndex={2}// Bigger number in front
			opacity={() => {// Calculate opacity from Y offset
				let y_offset_scaled = this.y_offset() / (MemoryValue.height_grid*this.grid_size());
				if(y_offset_scaled > -1) {
					if(y_offset_scaled < 0) {
						return easeInOutCubic(y_offset_scaled + 1);
					}
					else {
						if(y_offset_scaled >= n_display_values - 1) {
							if(y_offset_scaled < n_display_values) {
								return easeInOutCubic(y_offset_scaled + 1 - n_display_values, 1, 0);
							}
							else {
								return 0;
							}
						}
						else {
							return 1;
						}
					}
				}
				else {
					return 0;
				}
			}}
		>
			<Txt
				text={() => `0x${this.index.toString(16).padStart(this.index_size_hex_digits, '0')}:`}
				fontFamily={'Vera Mono'}
				fontSize={this.grid_size}
				fill={'#fff'}
				position={() => new Vector2(-3, 0).scale(this.grid_size())}
			/>
			<Rect
				radius={2}
				stroke={'#fff'}
				lineWidth={1}
				width={() => this.grid_size()*5}
				height={() => this.grid_size()*1.7}
				position={() => new Vector2(2, 0).scale(this.grid_size())}
			>
				<Txt
					ref={this.txt_ref}
					text={() => `0x${this.n().toString(16).padStart(this.n_size_hex_digits, '0')}`}
					fontFamily={'Vera Mono'}
					fontSize={this.grid_size}
					fill={() => this.value_color()}
					lineWidth={1}
				/>
			</Rect>
		</Rect>);
	}
}

// Graphical representation of memory
class MemoryContainer {
	static width_grid: number = 10;
	static height_grid: number = 20;
	static n_display_values: number = 18;
	address: SimpleSignal<number>;
	data_display: Array<MemoryValue>;// Not used to actually address memory, only for animation
	items_rect: Reference<Rect>;
	size: number;
	data: Uint16Array<ArrayBufferLike>;// Source of the memory's contents
	data_size_hex_digits: number;
	address_size_hex_digits: number;
	rect_ref: Reference<Rect>;
	grid_size: SimpleSignal<number>;
	position_grid: SimpleSignal<Vector2>;
	constructor(
		data_size_hex_digits: number,
		address_size_hex_digits: number,
		grid_size: SimpleSignal<number>,
		position_grid: SimpleSignal<Vector2>
	) {
		this.address = createSignal(0);
		this.data_display = [];
		this.items_rect = createRef<Rect>();
		this.size = Math.pow(16, address_size_hex_digits);
		this.data = new Uint16Array(this.size);
		this.data_size_hex_digits = data_size_hex_digits;
		this.address_size_hex_digits = address_size_hex_digits;
		this.rect_ref = createRef<Rect>();
		this.grid_size = grid_size;
		this.position_grid = position_grid;
	}
	init_rect(parent_rect: View2D | Rect) {
		parent_rect.add(<Rect
			position={this.position_grid().scale(this.grid_size())}
			width={() => this.grid_size() * MemoryContainer.width_grid}
			height={() => this.grid_size() * MemoryContainer.height_grid}
			ref={this.rect_ref}
		>
			<Txt
				text='⋮'
				fill={'#FFFFFF'}
				fontFamily={'Vera Mono'}
				fontSize={this.grid_size}
				textAlign={'center'}
			/>
			<Rect
				ref={this.items_rect}
				height={() => MemoryContainer.n_display_values * MemoryValue.height_grid * this.grid_size()}
				width={() => MemoryValue.width_grid * this.grid_size()}
			/>
			<Txt
				text='⋮'
				fill={'#FFFFFF'}
				fontFamily={'Vera Mono'}
				fontSize={this.grid_size}
				textAlign={'center'}
				position={() => new Vector2(2, MemoryContainer.n_display_values - 1).scale(this.grid_size())}
			/>
		</Rect>);
		// Add initial values
		for(let i = 0; i < MemoryContainer.n_display_values; i++) {
			let address = (this.size-i) % this.size;
			let new_value = new MemoryValue(0, address, this.data_size_hex_digits, this.address_size_hex_digits, this.memory_address_to_display_rel_y(address, 0), this.grid_size);
			this.data_display.push(new_value);
			new_value.init_rect(parent_rect, MemoryContainer.n_display_values);
		}
	}
	private memory_address_to_display_rel_y(address: number, shift: number) {
		// If `shift` != 0 then it is assumed that the shift takes place after this.address is updated
		let address_diff_up = (((this.size*1.5) + (this.address() + shift - address)) % this.size) - (this.size/2);
		return address_diff_up * MemoryValue.height_grid * this.grid_size();// TODO
	}
	animate_address_shift(view: View2D, new_address: number, t: number) {
		let diff;// Direction the animation will show the memory "tape" "moving", for example if its going from 0x00 to 0xFF it shouldn't scroll across the whole thing but loop around and just go down 1 step
		let diff_raw = new_address - this.address();
		let diff_raw_abs = Math.abs(diff_raw);
		if(diff_raw_abs < this.size / 2) {
			diff = diff_raw;
		}
		else {
			diff = diff_raw - this.size;// Don't touch, it works
		}
		let tweens = [];
		// TODO: Delete hidden items from possible previous shifts
		// Create new items
		for(let i_raw = 0; i_raw < Math.abs(diff); i_raw++) {
			let i;// Memory index
			if(diff > 0) {
				i = this.address() + i_raw + 1;// Scrolling down, new items shown on top
			}
			else {
				i = ((this.address() - i_raw - MemoryContainer.n_display_values) + this.size) % this.size;// Scrolling up, new values on bottom
			}
			let new_stack_value = new MemoryValue(this.data[i], i, this.data_size_hex_digits, this.address_size_hex_digits, this.memory_address_to_display_rel_y(i, 0), this.grid_size);
			new_stack_value.base_topleft_pos = () => {return this.items_rect().topLeft()};
			this.data_display.push(new_stack_value);
			new_stack_value.init_rect(this.rect_ref(), MemoryContainer.n_display_values);
		}
		// Apply Y position animations to all of them
		for(let i = 0; i < this.data_display.length; i++) {
			tweens.push(this.data_display[i].y_offset(this.memory_address_to_display_rel_y(this.data_display[i].index, diff), t));
		}
		// Update address
		this.address(new_address);
		return tweens;
	}
	animate_write_value(value: number, t: number) {
		this.data[this.address()] = value;
		// The display value for the current address is at the top, so at index = 0
		this.data_display[0].n(value);
		this.data_display[0].value_color(written_to_color);
		return this.data_display[0].value_color(new Color('FFF'), t);
	}
	set_value_base_position() {
		for(let i = 0; i < this.data_display.length; i++) {
			this.data_display[i].base_topleft_pos = () => {return this.items_rect().topLeft()};
		}
	}
}