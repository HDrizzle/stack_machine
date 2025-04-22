import {Circle, Layout, makeScene2D, Rect, View2D, Txt} from '@motion-canvas/2d';
import {all, beginSlide, waitFor, createRef, Reference, Signal, SimpleSignal, createSignal, DEFAULT, Color} from '@motion-canvas/core';

export default makeScene2D(function* (view) {
	// Init
	const half_width = 960;
	const half_height = 540;
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
		// Add graphics
		view.add(
			<Rect
				layout
				ref={this.layout}
				grow={8}
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
				{this.stack.init_rect()}
				{this.alu.init_rect()}
			</Rect>
		);
	}
	test_animation() {
		return this.test_signal(100, 2).to(DEFAULT, 2);
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
			grow={8}
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

class StackValue {
	n: number;
	index: number;
	rect_ref: Reference<Rect>;
	txt_ref: Reference<Txt>;
	value_font_size: number;
	title_font_size: number;
	constructor(n: number, index: number, value_font_size: number, title_font_size: number) {
		this.value_font_size = value_font_size;
		this.title_font_size = title_font_size;
		this.n = n;
		this.index = index;
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
				text={() => `0x${this.index.toString(16).padStart(4, '0')}:`}
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
					text={() => `0x${this.n.toString(16).padStart(2, '0')}`}
					fill={'#fff'}
					fontFamily={'Vera Mono'}
					fontSize={this.value_font_size}
					stroke={'#fff'}
					lineWidth={1}
				/>
			</Rect>
		</Rect>;
	}
}

class Stack {
	tos: SimpleSignal<number>;
	offset: SimpleSignal<number>;
	data: Array<StackValue>;
	items_rect: Reference<Rect>;
	value_font_size: number;
	title_font_size: number;
	constructor(value_font_size: number, title_font_size: number) {
		this.value_font_size = value_font_size;
		this.title_font_size = title_font_size;
		this.tos = createSignal(0);
		this.offset = createSignal(0);
		this.data = [];
		this.items_rect = createRef<Rect>();
	}
	init_rect() {
		let return_rect = <Rect
			layout
			grow={8}
			fill={'#000'}
			radius={2}
			stroke={'#fff'}
			lineWidth={2}
			margin={2}
			padding={10}
		>
			<Rect
				layout
				grow={8}
				fill={'#000'}
				margin={0}
				padding={0}
				direction={'column'}
			>
				<Txt
					text={() => `Stack Memory`}
					fill={'#FFFFFF'}
					fontFamily={'Vera Mono'}
					fontSize={this.title_font_size}
				/>
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
			<Rect
				layout
				ref={this.items_rect}
				grow={8}
				fill={'#000'}
				margin={0}
				padding={5}
				direction={'column'}
			></Rect>
		</Rect>;
		// Add initial stack values (wrap around to 65,535)
		for(let i = 0; i < 10; i++) {
			let new_stack_value = new StackValue(0, 65535-i, this.value_font_size, this.title_font_size);
			this.data.push(new_stack_value);
			this.items_rect().add(new_stack_value.init_rect());
		}
		return return_rect;
	}
}