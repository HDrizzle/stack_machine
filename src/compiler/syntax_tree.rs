//! For creating and validating syntax tree

use crate::prelude::*;
use super::{Token, TokenEnum};

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum SyntaxTreeNodeType {
	Program,// The root node should always have this type
	Macro(Macro),
	Instruction,
	InstructionToken(Token),
	Comment,
	StringLiteral(String)
}

#[derive(Debug, Clone, Copy)]
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
		let type_opt: Option<SyntaxTreeNodeType>;
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
				type_opt = Some(SyntaxTreeNodeType::Program);
			},
			Self::Macro => {
				// Set node type
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
					if source[i] == ';' {
						i += 1;
						break;
					}
					if source[i] != ' ' {
						return Err(ParseError::new(i, i+1, ParseErrorType::InvalidCharacterInContext(source[i], *self), None));
					}
				}
				type_opt = Some(SyntaxTreeNodeType::Instruction);
			},
			Self::InstructionToken => {
				let (assembly_word, new_i) = parse_identifier(source, i, Some(*self))?;
				let token: Token = match check_for_and_parse_bit_string(source, i, Some(*self)) {
					Some(result_) => {
						let (bytes_vec, bit_size, _) = result_?;
						Token {
							enum_: TokenEnum::Literal{n: bytes_vec[0], bit_size},
							raw: assembly_word
						}
					},
					None => {
						Token {
							enum_: TokenEnum::AssemblyWord(assembly_word.clone()),
							raw: assembly_word
						}
					}
				};
				i = new_i;
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
			None => panic!("`type_opt` not set by end of parse function")
		}
	}
}

#[derive(Debug, PartialEq, Eq)]
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
	pub fn build_tree(source: &Vec<char>) -> Result<Self, ParseError> {
		ParseContext::Program.parse(source, 0)/* {
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

#[derive(Debug)]
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

#[derive(Debug)]
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