//! For creating and validating syntax tree

use std::fmt::Write;
use crate::prelude::*;
use super::{Token, TokenEnum};

#[derive(Clone, Debug)]
pub enum SyntaxTreeNodeType {
	Program,// The root node should always have this type
	Macro(Macro),
	Instruction,
	InstructionToken(Token)/*,
	InstructionTokenLiteral {
		len_bits: usize,
		value: u128// Probably enough
	}*/,
	Comment,
	StringLiteral(String)
}

/*impl SyntaxTreeNodeType {
	pub fn context(&self) -> ParseContext {
		match self {
			Self::Program => ParseContext::Program,
			Self::Macro => ParseContext::Macro,
			Self::MacroName(..) => ParseContext::MacroName,
			Self::MacroArgs => ParseContext::MacroArgs,
			Self::MacroArg(..) => ParseContext::MacroArg,
			Self::Instruction => ParseContext::Instruction,
			Self::InstructionTokenWord(..) => ParseContext::InstructionTokenWord,
			Self::InstructionTokenLiteral{..} => ParseContext::InstructionTokenLiteral,

		}
	}
}*/

#[derive(Clone, Copy)]
pub enum ParseContext {
	Program,
	Macro,
	Instruction,
	InstructionToken,
	Comment,
    StringLiteral
}

impl ParseContext {
	pub fn parse(&self, source: &Vec<char>, start: usize) -> Result<SyntaxTreeNode, ParseError> {
		//let source_substring: &str = &source[start..source.len()];
		let mut children= Vec::<SyntaxTreeNode>::new();
		let mut type_opt: Option<SyntaxTreeNodeType> = None;
		let mut i: usize = start;
		match self {
			Self::Program => {
				while i < source.len() {// Top level node type, so loop through everything
					// Skip whitespace
					i = skip_whitespace(source, i, Some(*self))?;
					let char_: char = source[i];
					// Check if identifier (instruction)
					if IDENTIFIER_CHARS.contains(&char_) {// Create new child of type Instruction
						match ParseContext::Instruction.parse(source, i) {
							Ok(instruction_node) => {
								i = instruction_node.end;
								children.push(instruction_node);
								continue;
							},
							Err(errs) => {return Err(errs)}
						}
					}
					// Check if macro
					if char_ == MACRO_BEGIN {
						match ParseContext::Macro.parse(source, i+1) {
							Ok(macro_child) => {
								i = macro_child.end;
								children.push(macro_child);
								continue;
							},
							Err(errs) => {return Err(errs)}
						}
					}
					// Check if comment
					if char_ == COMMENT_BEGIN {
						match ParseContext::Comment.parse(source, i+1) {
							Ok(comment_child) => {
								i = comment_child.end;
								children.push(comment_child);
								continue;
							},
							Err(errs) => {return Err(errs)}
						}
					}
					// Skip whitespace
					i = skip_whitespace(source, i, Some(*self))?;
					// Check if next next character is semicolon ";"
					if source[i] != ';' {
						return Err(ParseError::new(i, i+1, ParseErrorType::InvalidCharacterInContext(source[i], *self), Some("Expected \";\"'".to_string())));
					}
					// Skip semicolon
					i += 1;
				}
			},
			Self::Macro => {
				/*// First, read macro name
				let (name, new_i) = parse_identifier(source, i, Some(*self))?;
				// Skip whitespace after macro name
				i = skip_whitespace(source, new_i, Some(*self))?;
				// Check that next character is "("
				if source[i] != '(' {
					return Err(ParseError::new(i, i+1, ParseErrorType::InvalidCharacterInContext(source[i], *self), Some("Expected \"(\"".to_string())));
				}
				i += 1;// get past the opening "("
				// Build list of arguments
				loop {
					// Skip whitespace
					i = skip_whitespace(source, i, Some(*self))?;
					let mut char_: char = source[i];
					// Check if first character is a quote to begin a string, or an identifier character
					if char_ == '\"' {
						let (string_arg, end) = SyntaxTreeNodeType::parse_string_literal(source, i+1)?;
						children.push(SyntaxTreeNode {
							type_: string_arg,
							begin: i+1,
							end,
							children: vec![]
						});
						i = end+1;
					}
					// Check if identifier
					if IDENTIFIER_CHARS.contains(&char_) {
						let begin = i;
						let (arg, new_i) = parse_identifier(source, i, Some(*self))?;
						i = new_i;
						children.push(SyntaxTreeNode::new(SyntaxTreeNodeType::StringLiteral(arg), begin, i, vec![]));
					}
					// Skip whitespace
					i = skip_whitespace(source, i, Some(*self))?;
					// Check if next character is )
					char_ = source[i];
					if char_ == ')' {
						i += 1;
						break;
					}
					// No other characters are allowed here
					if char_ != ',' {
						return Err(ParseError::new(i, i+1, ParseErrorType::InvalidCharacterInContext(char_, *self), Some("Expected \",\"".to_string())));
					}
				}
				// Set node type
				type_opt = Some(SyntaxTreeNodeType::Macro(name));*/
                let (macro_, new_i) = Macro::parse(source, i)?;
                type_opt = Some(SyntaxTreeNodeType::Macro(macro_));
                i = new_i;
			},
			Self::Instruction => {// An instruction will consist entirely of identifier characters and spaces
				while i < source.len() {
					// Skip whitespace
					i = skip_whitespace(source, i, Some(*self))?;
					// Check if identifier
					if IDENTIFIER_CHARS.contains(&source[i]) {
						let token_child = ParseContext::InstructionToken.parse(source, i)?;
						i = token_child.end;
						children.push(token_child);
					}
					else {
						return Err(ParseError::new(i, i+1, ParseErrorType::InvalidCharacterInContext(source[i], *self), None));
					}
					// Check that next character is a space " "
					if source[i] != ' ' {
						return Err(ParseError::new(i, i+1, ParseErrorType::InvalidCharacterInContext(source[i], *self), None));
					}
				}
			},
			Self::InstructionToken => {
				let (assembly_word, new_i) = parse_identifier(source, i, Some(*self))?;
				let token: Token = match check_for_and_parse_bit_string(source, new_i, Some(*self)) {
					Some(result_) => {
						let (bytes_vec, bit_size, new_i) = result_?;
						i = new_i;
						Token {
							enum_: TokenEnum::Literal{n: bytes_vec[0], bit_size},
							raw: assembly_word
						}
					},
					None =>{
						i = new_i;
						Token {
							enum_: TokenEnum::AssemblyWord(assembly_word.clone()),
							raw: assembly_word
						}
					}
				};
				type_opt = Some(SyntaxTreeNodeType::InstructionToken(token));
			},
			Self::Comment => {// Comment starts after "#" and ends after newline, `i` is assumed to be the next character after the "#"
				while i < source.len() {
					if source[i] == '\n' {
						break;
					}
					i += 1;
				}
				type_opt = Some(SyntaxTreeNodeType::Comment);
			},
            Self::StringLiteral => {// Wrapper for crate::prelude::parse_string_literal()
                let (parsed_string, new_i) = parse_string_literal(source, i)?;
                type_opt = Some(SyntaxTreeNodeType::StringLiteral(parsed_string));
                i = new_i;
            }
		}
		// Done
		match type_opt {
			Some(node_type) => Ok(SyntaxTreeNode {
				type_: node_type,
				begin: start,
				end: i,
				children
			}),
			None => panic!("`node_type` not set by end of parse function")
		}
	}
}

#[derive(Debug)]
pub struct SyntaxTreeNode {
	pub type_: SyntaxTreeNodeType,
	/// Inclusive
	pub begin: usize,
	/// Exclusive
	pub end: usize,
	pub children: Vec<Self>
}

impl SyntaxTreeNode {
	/// Basically a wrapper for `ParseContext::parse()`
	pub fn build_tree(&self, source: &str) -> Result<Self, ParseError> {
		ParseContext::Program.parse(&source.chars().into_iter().collect::<Vec<char>>(), 0)/* {
			Ok((root_node, _)) => Ok(root_node),
			Err(errs) => Err(errs)
		}*/
	}
	/// New
	pub fn new(type_: SyntaxTreeNodeType, begin: usize, end: usize, children: Vec<Self>) -> Self {
		Self {
			type_,
			begin,
			end,
			children
		}
	}
}

pub enum ParseErrorType {
	InvalidCharacterInContext(char, ParseContext),
	UnfinishedNode(ParseContext),
	MissingMacroIdentifier,
	StringInvalidEscapeSequence(char),
	StringEscapeEOF,
	HexParseError,
    InvalidMacroIdentifier(String),
    MacroWrongNumArgs{actual: usize, correct: usize}
}

pub struct ParseError {
	pub begin: usize,
	pub end: usize,
	pub type_: ParseErrorType,
	pub message: Option<String>
}

impl ParseError {
	pub fn new(
		begin: usize,
		end: usize,
		type_: ParseErrorType,
		message: Option<String>
	) -> Self {
		Self {
			begin,
			end,
			type_,
			message
		}
	}
}