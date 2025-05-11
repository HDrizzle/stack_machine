import {Circle, Layout, makeScene2D, Rect, View2D, Txt, Img, Code, vector2Signal, Line, CircleSegment} from '@motion-canvas/2d';
import {all, beginSlide, waitFor, createRef, Reference, Signal, SimpleSignal, createSignal, DEFAULT, Color, Vector2Signal, Vector2, SignalTween, SimpleVector2Signal, useLogger, easeInOutCubic, SignalGenerator} from '@motion-canvas/core';
import title_slide_background from '../../images/title_slide_background.png';
import bool_value_scrot from '../../images/bool_value_scrot.png';
import binary_decimal from '../../images/binary-decimal.png';
import bin_to_dec from '../../images/bin_to_dec_gsheets.png';
import bin_to_hex from '../../images/bin_to_hex_gsheets.png';
import led_off from '../../images/led_off.jpeg';
import led_on from '../../images/led_on.jpeg';

/* Slides
Title
Binary intro
Binary numbers, 0xNumbers
Logic gates
Adder
Sequential logic, D latches
Clock
Instruction, what does each line of a program do?
What does the hardware have to do?
Stack & local variables
ALU
Heap
Control unit & PC
Call stack
Program memory
Putting it all together, use fancy animation here
Actually building it
What I learned
	Capacitors on chip supplies
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
	view.fill('#000');// Background
	// Starting slides
	// Title
	const title_ref = createRef<Rect>();
	view.add(
		<Rect ref={title_ref}>
			<Img src={title_slide_background} />
			<Rect layout direction={'column'}>
				<Txt textAlign={'center'} fontSize={80} fill={'#fff'}>Computer Design</Txt>
				<Txt textAlign={'center'} fontSize={40} fill={'#fff'}>Hadrian Ward</Txt>
			</Rect>
		</Rect>
	);
	yield* beginSlide('Title');
	title_ref().remove();
	// Bits intro
	const bin_intro_ref = createRef<Rect>();
	view.add(
		<Rect ref={bin_intro_ref} layout direction={'column'} width={half_width*2} height={half_height*2}>
			<Txt fontSize={slide_title_text_size} fill={'#fff'} textAlign={'center'}>Bits (Binary Digits)</Txt>
			<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'center'}>Also called Boolean values, most basic unit of information</Txt>
			<Rect layout grow={1} justifyContent={'space-around'}>
				<Rect layout direction={'column'} justifyContent={'space-around'}>
					<Txt fontSize={slide_title_text_size} fill={'#fff'} textAlign={'center'}>0</Txt>
					<Txt fontSize={slide_title_text_size} fill={'#fff'} textAlign={'center'}>False</Txt>
					<Txt fontSize={slide_title_text_size} fill={'#fff'} textAlign={'center'}>0 Volts</Txt>
					<Img src={led_off} height={half_height*0.5} alignSelf={'center'}></Img>
				</Rect>
				<Rect layout direction={'column'} justifyContent={'space-around'}>
					<Txt fontSize={slide_title_text_size} fill={'#fff'} textAlign={'center'}>1</Txt>
					<Txt fontSize={slide_title_text_size} fill={'#fff'} textAlign={'center'}>True</Txt>
					<Txt fontSize={slide_title_text_size} fill={'#fff'} textAlign={'center'}>5 Volts</Txt>
					<Img src={led_on} height={half_height*0.5} alignSelf={'center'}></Img>
				</Rect>
			</Rect>
		</Rect>
	);
	yield* beginSlide('Bits & bytes');
	bin_intro_ref().remove();
	// Binary numbers, 0xNumbers
	const bin_ref = createRef<Rect>();
	view.add(
		<Rect ref={bin_ref} layout justifyContent={'space-around'} width={half_width*2} height={half_height*2}>
			<Rect layout direction={'column'} width={half_width} justifyContent={'space-around'}>
				<Txt fontSize={slide_title_text_size} fill={'#fff'} textAlign={'center'}>Binary Numbers</Txt>
				<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap>
					Made up of bits, a common length of 8 bits is a Byte.
				</Txt>
				<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap>
					A String of bits can be interpreted as a number. Instead of each place value being a power of 10, they are powers of 2.
				</Txt>
				<Img src={binary_decimal}  width={half_width*0.8} alignSelf={'center'}></Img>
				<Txt fontSize={citation_text_size} fill={'#fff'} textAlign={'center'} textWrap>
					learningc.org/chapters/chapter01-computers/main-memory.html
				</Txt>
			</Rect>
			<Rect layout direction={'column'} width={half_width} justifyContent={'space-around'}>
				<Txt fontSize={slide_title_text_size} fill={'#fff'} textAlign={'center'}>Hexadecimal</Txt>
				<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap>
					Since binary doesn't "map well" to decimal, a representation known as Hexadecimal is used. It has a base of 16 so 6 letters are used after the decimal digits.
				</Txt>
				<Rect layout direction={'column'}>
					<Code fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} code={'15 14 13 12 11 10  9  8  7  6  5  4  3  2  1  0'} />
					<Code fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} code={' ↓  ↓  ↓  ↓  ↓  ↓  ↓  ↓  ↓  ↓  ↓  ↓  ↓  ↓  ↓  ↓'} />
					<Code fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} code={' F  E  D  C  B  A  9  8  7  6  5  4  3  2  1  0'} />
				</Rect>
				<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap>
					Because the base of hexadecimal (16) is a power of the base of binary (2), each binary digit's place value maps to only one hexadecimal digit. Converting hex to binary is also easy because each hex digit maps to exactly 4 bits.
				</Txt>
				<Rect layout>
					<Img src={bin_to_dec} height={half_height*0.7} alignSelf={'center'}></Img>
					<Img src={bin_to_hex} height={half_height*0.7} alignSelf={'center'}></Img>
				</Rect>
			</Rect>
		</Rect>
	);
	yield* beginSlide('Binary');
	bin_ref().remove();
	// Logic gates, TODO
	const gates_ref = createRef<Rect>();
	view.add(
		<Rect ref={gates_ref} direction={'column'} width={half_width*2} height={half_height*2} layout>
			<Txt fontSize={slide_title_text_size} fill={'#fff'} textAlign={'center'}>Logic Gates</Txt>
			<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap>
				A logic gate is anything takes one or more bits as input and returns one output. An easy way to think about logic gates is by equating them to sentances:
			</Txt>
			<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap>
				"If __ AND __ then __" is an AND gate, "If __ OR __ then __" is an OR gate.
			</Txt>
		</Rect>
	);
	let logic_circuit = new LogicCircuit(
		[
			new GateAnd(createSignal(new Vector2(0, -5)), "And-0"),
			new GateNand(createSignal(new Vector2(0, 0)), "Nand-0"),
			new GateOr(createSignal(new Vector2(10, -5)), "Or-0"),
			new GateNor(createSignal(new Vector2(10, 0)), "Nor-0"),
			new GateNot(createSignal(new Vector2(0, 5)), "Not"),
			new LogicSingleInput(createSignal(new Vector2(-6, -1)), "In-0"),
			new LogicSingleInput(createSignal(new Vector2(-6, 1)), "In-1")
		],
		[
			[["In-0", 0], ["Nand-0", 0], ["And-0", 0], ["Or-0", 0], ["Nor-0", 0]],
			[["In-1", 0], ["Nand-0", 1], ["And-0", 1], ["Or-0", 1], ["Nor-0", 1], ["Not", 0]],
			[["Not", 1]]
		],
		createSignal(40)
	);
	logic_circuit.init_view(view);
	logic_circuit.set_input("In-0", true);
	yield* all(...logic_circuit.animate(1));
	logic_circuit.compute();
	logic_circuit.set_input("In-1", true);
	yield* all(...logic_circuit.animate(1));
	logic_circuit.compute();
	yield* all(...logic_circuit.animate(1));
	yield* logic_circuit.grid_size(20, 1).to(40, 1);
	//yield* all(...logic_circuit.components[0].compute_animate(1));
	yield* beginSlide('Logic gates');
	gates_ref().remove();
	// Adder
	// TODO
	// Sequential logic
	// TODO
	// Clock
	// TODO
	// C++ to Assembly, what do programs do?
	// TODO
	// Hardware
	// TODO
	// Stack Intro
	const stack_intro_ref = createRef<Rect>();
	view.add(
		<Rect ref={stack_intro_ref} layout>
			<Rect layout direction={'column'} width={half_width*1.3333}>
				<Txt fontSize={slide_title_text_size} fill={'#fff'} textAlign={'center'}>Reverse Polish Notation</Txt>
				<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap>
					In the 1920s, Polish mathematician Jan Lucasiewicz proposed a new way to write math expressions, where the operator came before the operands instead of between them. This became known as Polish notation or Prefix notation.
				</Txt>
				<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap>
					However, the limitation is that a computer evaluating prefix notation has to look ahead to determine what has to be evaluated first. In the 1950s, Charles L. Hamblin created what is now called Reverse polish notation (RPN) or Postfix notation, where the operator comes after the operands.
				</Txt>
				<Txt fontSize={citation_text_size} fill={'#fff'} textAlign={'left'} textWrap>mathworld.wolfram.com/ReversePolishNotation.html</Txt>
			</Rect>
			<Rect layout direction={'column'} width={half_width*0.6666}>
				<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap>
					Polish notation:
				</Txt>
				<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap>
					1 + 2 becomes +, 1, 2
				</Txt>
				<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap marginBottom={20}>
					3 / (1 + 2) becomes /, 3, +, 1, 2
				</Txt>
				<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap>
					Reverse polish notation (RPN):
				</Txt>
				<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap>
					1 + 2 becomes 1, 2, +
				</Txt>
				<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap>
					6 / (1 + 2) becomes 6, 1, 2, +, /
				</Txt>
			</Rect>
		</Rect>
	);
	yield* beginSlide('Stack Intro');
	stack_intro_ref().remove();
	// RPN Intro
	const rpn_intro_ref = createRef<Rect>();
	view.add(
		<Rect ref={rpn_intro_ref} layout>
			<Rect layout direction={'column'} width={half_width*1.3333}>
				<Txt fontSize={slide_title_text_size} fill={'#fff'} textAlign={'center'}>Reverse Polish Notation</Txt>
				<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap>
					In the 1920s, Polish mathematician Jan Lucasiewicz proposed a new way to write math expressions, where the operator came before the operands instead of between them. This became known as Polish notation or Prefix notation.
				</Txt>
				<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap>
					However, the limitation is that a computer evaluating prefix notation has to look ahead to determine what has to be evaluated first. In the 1950s, Charles L. Hamblin created what is now called Reverse polish notation (RPN) or Postfix notation, where the operator comes after the operands.
				</Txt>
				<Txt fontSize={citation_text_size} fill={'#fff'} textAlign={'left'} textWrap>mathworld.wolfram.com/ReversePolishNotation.html</Txt>
			</Rect>
			<Rect layout direction={'column'} width={half_width*0.6666}>
				<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap>
					Polish notation:
				</Txt>
				<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap>
					1 + 2 becomes +, 1, 2
				</Txt>
				<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap marginBottom={20}>
					3 / (1 + 2) becomes /, 3, +, 1, 2
				</Txt>
				<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap>
					Reverse polish notation (RPN):
				</Txt>
				<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap>
					1 + 2 becomes 1, 2, +
				</Txt>
				<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap>
					6 / (1 + 2) becomes 6, 1, 2, +, /
				</Txt>
			</Rect>
		</Rect>
	);
	yield* beginSlide('RPN Intro');
	rpn_intro_ref().remove();
	// Computer animation
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

class MemoryValue {
	n: SimpleSignal<number>;
	index: number;
	n_size_hex_digits: number;
	index_size_hex_digits: number;
	rect_ref: Reference<Rect>;
	txt_ref: Reference<Txt>;
	value_font_size: number;
	title_font_size: number;
	y_offset: SimpleSignal<number>;// For animating scrolling memory
	value_color: SimpleSignal<Color>;
	base_topleft_pos: () => Vector2;
	constructor(n: number, index: number, n_size_hex_digits: number, index_size_hex_digits: number, value_font_size: number, title_font_size: number, top_y_pos: number) {
		this.value_font_size = value_font_size;
		this.title_font_size = title_font_size;
		this.n_size_hex_digits = n_size_hex_digits;
		this.index_size_hex_digits = index_size_hex_digits;
		this.rect_ref = createRef<Rect>();
		this.txt_ref = createRef<Txt>();
		this.n = createSignal(n);
		this.index = index;
		this.y_offset = createSignal(top_y_pos);
		this.value_color = createSignal(new Color('FFF'));
		this.base_topleft_pos = () => {return new Vector2(0, 0);};
	}
	init_rect(n_display_values: number) {
		// base_pos_callback is the position of the top-left corner of the `MemoryContainer`s `items_rect` placeholder
		return <Rect
			layout
			ref={this.rect_ref}
			topLeft={() => {return this.base_topleft_pos().add(new Vector2(15, this.y_offset()+5));}}
			fill={'#000'}
			radius={2}
			margin={2}
			padding={5}
			zIndex={2}// Bigger number in front
			opacity={() => {// Calculate opacity from Y offset
				let y_offset_scaled = this.y_offset() / MemoryValue.anticipate_height(this.value_font_size);
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
				fill={'#FFFFFF'}
				fontFamily={'Vera Mono'}
				fontSize={this.value_font_size}
			/>
			<Rect
				layout
				fill={'#000'}
				radius={2}
				stroke={'#fff'}
				lineWidth={1}
				margin={1}
				padding={2}
			>
				<Txt
					ref={this.txt_ref}
					text={() => `0x${this.n().toString(16).padStart(this.n_size_hex_digits, '0')}`}
					fontFamily={'Vera Mono'}
					fontSize={this.value_font_size}
					stroke={() => {return this.value_color();}}
					fill={() => {return this.value_color();}}
					lineWidth={1}
				/>
			</Rect>
		</Rect>;
	}
	static anticipate_height(value_font_size: number) {
		// Total width = 44 @ font = 20, diff = 24
		// Total width = 32 @ font = 10, diff = 22
		return value_font_size + 18;// TODO
	}
}

// Graphical representation of memory
class MemoryContainer {
	address: SimpleSignal<number>;
	data_display: Array<MemoryValue>;// Not used to actually address memory, only for animation
	items_rect: Reference<Rect>;
	size: number;
	data: Uint16Array<ArrayBufferLike>;// Source of the memory's contents
	data_size_hex_digits: number;
	address_size_hex_digits: number;
	value_font_size: number;
	title_font_size: number;
	n_display_values: number
	item_height: number;
	height_items_placeholder: number;
	height: number;
	width: SimpleSignal<number>;
	constructor(value_font_size: number, title_font_size: number, data_size_hex_digits: number, address_size_hex_digits: number) {
		this.address = createSignal(0);
		this.data_display = [];
		this.items_rect = createRef<Rect>();
		this.size = Math.pow(16, address_size_hex_digits);
		this.data = new Uint16Array(this.size);
		this.data_size_hex_digits = data_size_hex_digits;
		this.address_size_hex_digits = address_size_hex_digits;
		this.value_font_size = value_font_size;
		this.title_font_size = title_font_size;
		this.n_display_values = 10;
		this.item_height = MemoryValue.anticipate_height(value_font_size);
		this.height_items_placeholder = this.item_height * this.n_display_values;
		this.height = this.item_height * (this.n_display_values + 2);
		this.width = createSignal(0);
	}
	init_rect(view: View2D) {
		let return_rect = <Rect
			layout
			height={this.height}
			grow={1}
			fill={'#000'}
			margin={0}
			padding={5}
			direction={'column'}
		>
			<Txt
				text='⋮'
				fill={'#FFFFFF'}
				fontFamily={'Vera Mono'}
				fontSize={this.value_font_size}
				textAlign={'center'}
				grow={1}
			/>
			<Rect
				ref={this.items_rect}
				height={this.height_items_placeholder}
				width={() => {return this.width();}}
			/>
			<Txt
				text='⋮'
				fill={'#FFFFFF'}
				fontFamily={'Vera Mono'}
				fontSize={this.value_font_size}
				textAlign={'center'}
				grow={1}
			/>
		</Rect>;
		// Add initial values
		for(let i = 0; i < this.n_display_values; i++) {
			let address = (this.size-i) % this.size;
			let new_stack_value = new MemoryValue(0, address, this.data_size_hex_digits, this.address_size_hex_digits, this.value_font_size, this.title_font_size, this.memory_address_to_display_rel_y(address, 0));
			this.data_display.push(new_stack_value);
			//view.add(() => {return new Vector2(0, 0);});
			view.add(new_stack_value.init_rect(this.n_display_values));
		}
		this.width(this.data_display[0].rect_ref().width());
		return return_rect;
	}
	private memory_address_to_display_rel_y(address: number, shift: number) {
		// If `shift` != 0 then it is assumed that the shift takes place after this.address is updated
		let address_diff_up = (((this.size*1.5) + (this.address() + shift - address)) % this.size) - (this.size/2);
		return address_diff_up * this.item_height;// TODO
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
				i = ((this.address() - i_raw - this.n_display_values) + this.size) % this.size;// Scrolling up, new values on bottom
			}
			let new_stack_value = new MemoryValue(this.data[i], i, this.data_size_hex_digits, this.address_size_hex_digits, this.value_font_size, this.title_font_size, this.memory_address_to_display_rel_y(i, 0));
			new_stack_value.base_topleft_pos = () => {return this.items_rect().topLeft()};
			this.data_display.push(new_stack_value);
			view.add(new_stack_value.init_rect(this.n_display_values));
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

class LogicCircuit {
	components: Array<LogicDevice>;
	// List of nets, each net is a list pairs of [component index, component pin] and a color signal for animation
	nets: Array<[Array<[number, number]>, SimpleSignal<Color>]>;
	// Redundant w/ `nets`, just to improve performance
	// List of (Lists of pins and corresponding net index) for each component, so `net_i = pin_to_net_lookup[component_i][pin_i]`
	// Possibly `null` if pin is unconnected
	pin_to_net_lookup: Array<Array<number | null>>;
	grid_size: SimpleSignal<number>;
	rect_ref: Reference<Rect>;
	component_name_lookup: {[unique_name: string]: number};
	constructor(
		components: Array<LogicDevice>,
		nets: Array<Array<[number | string, number]>>,// Components can be referenced by index or unique name
		grid_size: SimpleSignal<number>
	) {
		this.components = components;
		// Find component names
		this.component_name_lookup = {};
		for(let component_i = 0; component_i < this.components.length; component_i++) {
			if(this.components[component_i].unique_name !== null) {
				// TODO: Check if name is repeated
				this.component_name_lookup[this.components[component_i].unique_name] = component_i;
			}
		}
		// Assign nets
		this.nets = [];
		for(let net_i = 0; net_i < nets.length; net_i++) {
			let net_connections: Array<[number, number]> = [];
			for(let conn_i = 0; conn_i < nets[net_i].length; conn_i++) {
				let [component_query, pin_i] = nets[net_i][conn_i];
				let component_i;
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
				net_connections.push([component_i, pin_i]);
			}
			this.nets.push([net_connections, createSignal(logic_wire_color([false, true]))]);
		}
		// Create pin to net lookup table and assign pin color signals from net color signals
		this.pin_to_net_lookup = [];
		for(let component_i = 0; component_i < this.components.length; component_i++) {
			let component_pins_lookup = [];
			for(let pin_i = 0; pin_i < this.components[component_i].n_pins(); pin_i++) {
				// Now have to look at each net to find where this pin is connected, which is why I am putting this code here for a one-time cost rather than in the loop
				let found_net_i: number | null = null;
				let n_nets_connected = 0;
				for(let net_i = 0; net_i < this.nets.length; net_i++) {
					for(let net_pin_i = 0; net_pin_i < this.nets[net_i][0].length; net_pin_i++) {
						let [test_component_i, test_pin_i] = this.nets[net_i][0][net_pin_i];
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
						this.components[component_i].index_pin(pin_i).color = this.nets[found_net_i][1];
					}
					else {
						throw new Error(`Pin #${pin_i} of component #${component_i} is connected to ${n_nets_connected} nets`);
					}
				}
			}
			this.pin_to_net_lookup.push(component_pins_lookup);
		}
		this.grid_size = grid_size;
		this.rect_ref = createRef<Rect>();
	}
	init_view(view: View2D) {
		for(let i = 0; i < this.components.length; i++) {
			this.components[i].init_rect(view, this.grid_size);
		}
	}
	// Returns whether simulation is stable (everything has propagated)
	// To run simulation completely, loop this function until it returns `false`
	// It may never return `false` (like of a NOT gat is connected to itself) so be sure to impose a limit to prevent infinite loops
	compute(): boolean {
		let anything_changed: boolean = false;
		// For performance
		let computed_nets_dict: {[net_i: number]: [state: boolean, valid: boolean]} = {};
		// Calculate all input pin states, DO NOT USE .compute() YET
		let input_states: Array<Array<boolean>> = [];
		for(let component_i = 0; component_i < this.components.length; component_i++) {
			let component_input_states = [];
			for(let pin_i = 0; pin_i < this.components[component_i].inputs.length; pin_i++) {// Only iterating over input pins
				let net_i = this.pin_to_net_lookup[component_i][pin_i];
				let state: [state: boolean, valid: boolean];
				if(net_i in computed_nets_dict) {// Cache hit
					state = computed_nets_dict[net_i];
				}
				else {// Cache miss
					state = this.get_net_state(net_i);
					computed_nets_dict[net_i] = state;
				}
				if(!state[1]) {
					throw new Error("Net state is either undefined or contested, simulation cannot be continued deterministically");
				}
				component_input_states.push(state[0]);
			}
			input_states.push(component_input_states);
		}
		// use `.compute()` to update all component outputs
		for(let component_i = 0; component_i < this.components.length; component_i++) {
			this.components[component_i].compute(input_states[component_i]);
		}
		// Check if anything was changed
		// TODO
		return true;
	}
	get_net_state(net_i: number): [state: boolean, valid: boolean] {
		const net: Array<[number, number]> = this.nets[net_i][0];
		let state = false;
		let n_writers = 0;// To determine if floating, set, or contested
		for(let i = 0; i < net.length; i++) {
			let logic_pin_state: [boolean, boolean] = this.components[net[i][0]].pin_state(net[i][1]);
			if(!logic_pin_state[1]) {// Check if pin is working as an output
				n_writers += 1;
				if(n_writers > 1 && state != logic_pin_state[0]) {// Already another writer which is different, contention!
					return [state, false];
				}
				state = logic_pin_state[0];
			}
		}
		if(n_writers == 0) {
			return [false, false];
		}
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
			if(wire_color != this.nets[net_i][1]()) {// Avoid useless tweens
				if(t > 0) {
					out.push(this.nets[net_i][1](wire_color, t));
				}
				else {
					this.nets[net_i][1](wire_color);
				}
			}
		}
		return out;
	}
	set_input(name: string, state: boolean) {
		let component = this.components[this.component_name_lookup[name]];
		if(component.is_input) {
			component.set_state(state);
		}
		else {
			throw new Error(`Attempt to set input state of component "${name}" which is not an input`);
		}
	}
}

class LogicConnectionPin {
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
}

// Could be a simple gate, or something more complicated like an adder, or maybe even the whole computer
abstract class LogicDevice {
    inputs: Array<LogicConnectionPin>;
	outputs: Array<LogicConnectionPin>;
	rect_ref: Reference<Rect>;
	position_grid: SimpleSignal<Vector2>;
	border_stroke: SimpleSignal<Color>;
	is_input: boolean;
	unique_name: string | null;
	constructor(input_pin_locations: Array<[Vector2, Vector2]>, output_pin_locations: Array<[Vector2, Vector2]>, position_grid: SimpleSignal<Vector2>, is_input: boolean, unique_name: string | null = null) {
		this.position_grid = position_grid;
		this.border_stroke = createSignal(new Color('#FFF'));
		this.is_input = is_input;
		this.unique_name = unique_name
		this.inputs = [];
		this.rect_ref = createRef<Rect>();
		for(let i = 0; i < input_pin_locations.length; i++) {
			this.inputs.push(new LogicConnectionPin(true, input_pin_locations[i][0], input_pin_locations[i][1]));
		}
		this.outputs = [];
		for(let i = 0; i < output_pin_locations.length; i++) {
			this.outputs.push(new LogicConnectionPin(false, output_pin_locations[i][0], output_pin_locations[i][1]));
		}
		this.compute(Array(input_pin_locations.length).fill(false));
		this.animate(0);
	}
    abstract init_rect(view: View2D, grid_size: SimpleSignal<number>): void;
	init_view_pins(grid_size: SimpleSignal<number>) {
		for(let i = 0; i < this.inputs.length + this.outputs.length; i++) {
			this.index_pin(i).init_view(this.rect_ref(), grid_size);
		}
	}
	// Just updates input and output states, doesn't modify color signals
	abstract compute(new_inputs: Array<boolean>): void;
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
		return this.inputs.length + this.outputs.length;
	}
	// Inputs are listed first, then outputs. For example pin 2 (0-indexed) of an AND gate would be the output
	index_pin(n: number): LogicConnectionPin {
		let pin;
		if(n >= this.inputs.length) {
			pin = this.outputs[n - this.inputs.length];
		}
		else {
			pin = this.inputs[n];
		}
		return pin;
	}
	// returns [state, high-Z]
	pin_state(n: number): [state: boolean, high_z: boolean] {
		let pin = this.index_pin(n);
		return [pin.state, pin.high_z];
	}
	position_px(grid_size: SimpleSignal<number>): Vector2 {
		return this.position_grid().scale(grid_size());
	}
}

class GateAnd extends LogicDevice {
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
			unique_name
		);
	}
	init_rect(view: View2D, grid_size: SimpleSignal<number>) {
		view.add(<Rect
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
			unique_name
		);
	}
	init_rect(view: View2D, grid_size: SimpleSignal<number>) {
		view.add(<Rect
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
				startAngle={-20}
				endAngle={20}
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
			unique_name
		);
	}
	init_rect(view: View2D, grid_size: SimpleSignal<number>) {
		view.add(<Rect
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
}

class GateNor extends LogicDevice {
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
			unique_name
		);
	}
	init_rect(view: View2D, grid_size: SimpleSignal<number>) {
		view.add(<Rect
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
				startAngle={-20}
				endAngle={20}
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
	compute(new_inputs: Array<boolean>) {
		for(let i = 0; i < 2; i++) {
			this.inputs[i].state = new_inputs[i];
		}
		this.outputs[0].state = !(this.inputs[0].state || this.inputs[1].state);
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
			unique_name
		);
	}
	init_rect(view: View2D, grid_size: SimpleSignal<number>) {
		view.add(<Rect
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
}

// Only 1 bit, may also make more general class
class LogicSingleInput extends LogicDevice {
	state: boolean;
	constructor(position: SimpleSignal<Vector2>, unique_name: string | null = null) {
		super(
			[],
			[
				[new Vector2(1, 0), new Vector2(1, 0)],
			],
			position,
			true,
			unique_name
		);
		this.state = false;
	}
	init_rect(view: View2D, grid_size: SimpleSignal<number>) {
		view.add(<Rect
			ref={this.rect_ref}
			width={() => grid_size() * 3}
			height={() => grid_size() * 2}
			position={() => this.position_px(grid_size)}
		>
			<Line
				points={[
					() => new Vector2(-1, -1).scale(grid_size()),
					() => new Vector2(1, -1).scale(grid_size()),
					() => new Vector2(1, 1).scale(grid_size()),
					() => new Vector2(-1, 1).scale(grid_size()),
					() => new Vector2(-1, -1).scale(grid_size())
				]}
				stroke={this.border_stroke}
				lineWidth={2}
			/>
			<Txt text={() => this.state ? "1" : "0"} fill={"FFF"} position={() => new Vector2(0, 0)} fontSize={() => grid_size()*1.1} />
		</Rect>);
		this.init_view_pins(grid_size);
	}
	compute(_new_inputs: Array<boolean>) {
		this.outputs[0].state = this.state;
	}
	set_state(state: boolean) {
		this.state = state;
		this.compute([]);
	}
}