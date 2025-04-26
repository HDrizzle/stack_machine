import {Circle, Layout, makeScene2D, Rect, View2D, Txt, Img, Code, vector2Signal} from '@motion-canvas/2d';
import {all, beginSlide, waitFor, createRef, Reference, Signal, SimpleSignal, createSignal, DEFAULT, Color, Vector2Signal, Vector2, SignalTween} from '@motion-canvas/core';
import title_slide_background from '../../images/title_slide_background.png';
import bool_value_scrot from '../../images/bool_value_scrot.png';
import binary_decimal from '../../images/binary-decimal.png';
import bin_to_dec from '../../images/bin_to_dec_gsheets.png';
import bin_to_hex from '../../images/bin_to_hex_gsheets.png';

/* Slides
Title
Binary numbers, 0xNumbers
Logic gates
Adder
Sequential logic, D latches
Clock
Instruction, what does each line of a program do?
What does the hardware have to do?
Stack
RPN
ALU
Heap
Control unit & PC
Program memory
Putting it all together, use fancy animation here
Actually building it
What I learned
What I would improve
Acknowledgements
*/

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
	// Binary numbers, 0xNumbers
	const bin_ref = createRef<Rect>();
	view.add(
		<Rect ref={bin_ref} layout>
			<Rect layout direction={'column'} width={half_width}>
				<Txt fontSize={slide_title_text_size} fill={'#fff'} textAlign={'center'}>Binary Numbers</Txt>
				<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap>
					The most basic unit of information is called a "bit" which is short for "binary digit" (IDK if thats why but it works). A bit can be one of two values, most commonly 0 or 1 but can also be represented as False or True, and Low or High. A bit is also called a Boolean value after mathematician George Boole.
				</Txt>
				<Img src={bool_value_scrot}></Img>
				<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap>
					A String of bits can be interpreted as a number. Instead of each place value being a power of 10, they are powers of 2.
				</Txt>
				<Img src={binary_decimal}  width={half_width*0.8} alignSelf={'center'}></Img>
				<Txt fontSize={citation_text_size} fill={'#fff'} textAlign={'center'} textWrap>
					learningc.org/chapters/chapter01-computers/main-memory.html
				</Txt>
			</Rect>
			<Rect layout direction={'column'} width={half_width}>
				<Txt fontSize={slide_title_text_size} fill={'#fff'} textAlign={'center'}>Hexadecimal</Txt>
				<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap>
					Since binary doesn't "map well" to decimal, a representation known as Hexadecimal is used. It has a base of 16 so 6 letters are used after the decimal digits.
				</Txt>
				<Code fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} code={'16 15 14 13 12 10  9  8  7  6  5  4  3  2  1  0'} />
				<Code fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} code={' ↓  ↓  ↓  ↓  ↓  ↓  ↓  ↓  ↓  ↓  ↓  ↓  ↓  ↓  ↓  ↓'} />
				<Code fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} code={' F  E  D  C  B  A  9  8  7  6  5  4  3  2  1  0'} />
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
		<Rect ref={gates_ref} direction={'column'} layout>
			<Txt fontSize={slide_title_text_size} fill={'#fff'} textAlign={'center'}>Logic Gates</Txt>
			<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap>
				A logic gate is anything takes one or more bits as input and returns one output. An easy way to think about logic gates is by equating them to sentances:
			</Txt>
			<Txt fontSize={paragraph_text_size} fill={'#fff'} textAlign={'left'} textWrap>
				"If __ AND __ then __" is an AND gate, "If __ OR __ then __" is an OR gate.
			</Txt>
		</Rect>
	);
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
	yield* beginSlide('RPN Intro');
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
	yield* machine.test_animation();
	// Testing
	/*const myCircle = createRef<Circle>();
	view.add(
		<Circle
			ref={myCircle}
			// try changing these properties:
			x={-960}
			y={-540}
			width={140}
			height={140}
			fill="#e13238"
		/>,
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
			>
				ref={this.layout}
				<Circle
					ref={this.test_circle}
					width={() => this.test_signal() * 2}
					height={() => this.test_signal() * 2}
					grow={1}
					fill="#e13238"
				/>
				<Circle
					width={70}
					height={70}
					grow={1}
					fill="#e13238"
				/>
				{this.call_stack.init_rect()}
				{this.gpram.init_rect()}
				{this.stack.init_rect()}
				{this.alu.init_rect()}
			</Rect>
		);
	}
	test_animation() {
		return all(...this.stack.memory_container.animate_address_shift(0, 1));
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
	n: number;
	index: number;
	n_size_hex_digits: number;
	index_size_hex_digits: number;
	rect_ref: Reference<Rect>;
	txt_ref: Reference<Txt>;
	value_font_size: number;
	title_font_size: number;
	position: Vector2Signal;
	constructor(n: number, index: number, n_size_hex_digits: number, index_size_hex_digits: number, value_font_size: number, title_font_size: number, top_y_pos: number) {
		this.value_font_size = value_font_size;
		this.title_font_size = title_font_size;
		this.n_size_hex_digits = n_size_hex_digits;
		this.index_size_hex_digits = index_size_hex_digits;
		this.n = n;
		this.index = index;
		this.position = Vector2.createSignal(new Vector2(0, top_y_pos));
	}
	init_rect() {
		return <Rect
			layout
			fill={'#000'}
			radius={2}
			margin={2}
			padding={5}
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
					text={() => `0x${this.n.toString(16).padStart(this.n_size_hex_digits, '0')}`}
					fill={'#fff'}
					fontFamily={'Vera Mono'}
					fontSize={this.value_font_size}
					stroke={'#fff'}
					lineWidth={1}
				/>
			</Rect>
		</Rect>;
	}
	static anticipate_height(value_font_size: number) {
		// Total width = 44 @ font = 20, diff = 24
		// Total width = 32 @ font = 10, diff = 22
		return value_font_size + 23;// TODO
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
	height: number;
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
		this.height = this.item_height * (this.n_display_values + 2);
	}
	init_rect() {
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
			<Rect layout ref={this.items_rect} direction={'column'}/>
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
			let new_stack_value = new MemoryValue(0, this.size-1-i, this.data_size_hex_digits, this.address_size_hex_digits, this.value_font_size, this.title_font_size, i*this.item_height);
			this.data_display.push(new_stack_value);
			this.items_rect().add(new_stack_value.init_rect());
		}
		return return_rect;
	}
	memory_address_to_display_rel_y(address: number) {
		return (address - this.address()) * this.item_height;// TODO
	}
	animate_address_shift(new_address: number, t: number) {
		let diff;// Direction the animation will thow the memory "tape" "moving", for example if its going from 0x00 to 0xFF it shouldn't scroll across the whole thing but loop around and just go down 2 steps
		let diff_raw = new_address - this.address();
		let diff_raw_abs = Math.abs(diff_raw);
		if(diff_raw_abs < this.size / 2) {
			diff = diff_raw;
		}
		else {
			diff = this.size - diff_raw;// TODO
		}
		// Create new items
		for(let i_raw = 0; i_raw < Math.abs(diff); i_raw++) {
			let i;// Memory index
			if(diff > 0) {
				i = this.address() + i_raw + 1;// Scrolling down, new items shown on top
			}
			else {
				i = this.address() - i_raw - this.n_display_values - 1;// Scrolling up, new values on bottom
			}
			let new_stack_value = new MemoryValue(this.data[i], i, this.data_size_hex_digits, this.address_size_hex_digits, this.value_font_size, this.title_font_size, this.memory_address_to_display_rel_y(i));
			this.data_display.push(new_stack_value);
			if(diff > 0) {
				this.items_rect().insert(new_stack_value.init_rect(), 0);// Beginning
			}
			else {
				this.items_rect().add(new_stack_value.init_rect());
			}
			
		}
		let tweens = [];
		// Apply Y position animations to all of them
		for(let i = 0; i < this.data_display.length; i++) {
			tweens.push(this.data_display[i].position(new Vector2(0, 0), t));// TODO
		}
		// Apply individual fade animations to all of them
		// Delete old ones
		return tweens;
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
	init_rect() {
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
				{this.memory_container.init_rect()}
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
	init_rect() {
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
				{this.memory_container.init_rect()}
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
	init_rect() {
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
				{this.memory_container.init_rect()}
			</Rect>
		</Rect>;
		return return_rect;
	}
}