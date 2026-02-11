//! Program skeleton, created from syntax tree, enable macro expansion

use std::collections::HashMap;
use crate::prelude::*;

use super::{assembly_encode::{Token, TokenEnum}, macros::{Macro, MacroArgument,MacroEnum}, syntax_tree::*};

/// Construct a more linear representation of the program as opposed to the syntax tree
/// At this step the final length of the program is now known, which means that @anchor() macros can be assigned addresses and all other macros expanded
/// `source` is required for finding line numbers
pub fn program_skeleton_build(tree_root: &SyntaxTreeNode, source: &Vec<char>) -> Result<Vec<(Vec<Token>, usize)>, ProgramSkeletonBuildError> {
	match &tree_root.type_ {
		SyntaxTreeNodeType::Program => {
			// Iterate over tree root's children
			let mut nodes = Vec::<(ProgramSkeletonNode, usize)>::new();// (node, line number)
			for tree_node in &tree_root.children {// Top level nodes, right under root
				match &tree_node.type_ {
					SyntaxTreeNodeType::Instruction => {
						// All children of instruction node should be tokens
						let mut tokens = Vec::<Token>::new();
						for instruction_child in &tree_node.children {
							match &instruction_child.type_ {
								SyntaxTreeNodeType::InstructionToken(token) => tokens.push(token.clone()),
								invalid => return Err(ProgramSkeletonBuildError::BadSyntaxNodeType(invalid.clone()))
							}
						}
						// Done
						nodes.push((ProgramSkeletonNode::Instruction(tokens), line_n_from_index(source, tree_node.begin)));
					},
					SyntaxTreeNodeType::Macro(macro_) => {nodes.push((ProgramSkeletonNode::Macro(macro_.clone()), line_n_from_index(source, tree_node.begin)));},
					SyntaxTreeNodeType::Comment => {},
					invalid => return Err(ProgramSkeletonBuildError::BadSyntaxNodeType(invalid.clone()))
				}
			}
			// Calculate size
			let mut size_total: usize = 0;
			for (node, _) in &nodes {
				size_total += node.instructions_represented() as usize;
			}
			if size_total > POWER_16 {
				return Err(ProgramSkeletonBuildError::ProgramTooLarge(size_total));
			}
			// Macro expansion, done
			macro_expansion(&nodes)
		},
		other => Err(ProgramSkeletonBuildError::BadSyntaxNodeType(other.clone()))
	}
}

fn macro_expansion(nodes: &Vec<(ProgramSkeletonNode, usize)>) -> Result<Vec<(Vec<Token>, usize)>, ProgramSkeletonBuildError> {
	let mut nodes_2 = Vec::<(ProgramSkeletonNode, usize)>::new();
	// Compile anchor addresses and delete anchor
	let mut anchors = HashMap::<String, usize>::new();
	let mut current_program_address: usize = 0;// Address of final instruction, NOT node list index
	for (node, line_n) in nodes {
		match node {
			ProgramSkeletonNode::Instruction(_) => {
				nodes_2.push((node.clone(), *line_n));
			},
			ProgramSkeletonNode::Macro(macro_) => {
				match macro_.type_ {
					MacroEnum::Anchor => {
						// Verify that type of macro's first argument is MacroArgument::Identifier(String)
						match &macro_.args[0] {
							MacroArgument::Identifier(anchor_name) => {
								// Check that the anchor name is not already defined
								if let Some(_) = anchors.get(anchor_name) {
									return Err(ProgramSkeletonBuildError::AnchorRedefinition(anchor_name.clone()));
								}
								// Create new anchor
								anchors.insert(anchor_name.clone(), current_program_address);
							},
							invalid => {return Err(ProgramSkeletonBuildError::MacroArgumentWrongType(invalid.clone()));}
						}
					},
					_ => {nodes_2.push((node.clone(), *line_n));}// Leave all other macros for now
				}
			}
		}
		current_program_address += node.instructions_represented() as usize;
	}
	// Expand other macros
	let mut out = Vec::<(Vec<Token>, usize)>::new();
	for (node, line_n) in &nodes_2 {
		match node {
			ProgramSkeletonNode::Instruction(tokens) => {
				out.push((tokens.clone(), *line_n));
			},
			ProgramSkeletonNode::Macro(macro_) => {
				match macro_.type_ {
					MacroEnum::Anchor => {
						panic!("Logic error: Anchor macro encountered during 2nd macro expansion loop")
					},
					MacroEnum::Call => {
						let anchor_name = macro_.args[0].to_string();
						out.append(&mut expand_address_set_macro(&anchors, &anchor_name, "call".to_owned(), *line_n)?);
					},
					MacroEnum::Goto => {
						let anchor_name = macro_.args[0].to_string();
						out.append(&mut expand_address_set_macro(&anchors, &anchor_name, "goto".to_owned(), *line_n)?);
					},
					MacroEnum::GotoIf => {
						let anchor_name = macro_.args[0].to_string();
						out.append(&mut expand_address_set_macro(&anchors, &anchor_name, "goto-if".to_owned(), *line_n)?);
					},
					MacroEnum::WriteString => {
						let string_to_write: String = macro_.args[0].to_string();
						// Write GPRAM instructions
						for char_ in string_to_write.chars() {
							out.push((
								vec![
									Token::new(TokenEnum::AssemblyWord("write".to_string()), "<Expanded macro>".to_owned()),
									Token::new(TokenEnum::Literal{n: char_ as u8, bit_size: 8}, "<Expanded macro>".to_owned()),
									Token::new(TokenEnum::AssemblyWord("gpram-inc-addr".to_string()), "<Expanded macro>".to_owned())
								],
								*line_n
							));
						}
						// Push size to stack
						if string_to_write.len() >= POWER_16 {
							return Err(ProgramSkeletonBuildError::MacroWriteStringArgumentTooLong(string_to_write.len()));
						}
						let string_size_u16 = string_to_write.len() as u16;
						out.push((
							vec![
								Token::new(TokenEnum::AssemblyWord("write".to_string()), "<Expanded macro>".to_owned()),
								Token::new(TokenEnum::Literal{n: (string_size_u16 & 0x00FF) as u8, bit_size: 8}, "<Expanded macro>".to_owned()),
								Token::new(TokenEnum::AssemblyWord("stack-push".to_string()), "<Expanded macro>".to_owned())
							],
							*line_n
						));
						out.push((
							vec![
								Token::new(TokenEnum::AssemblyWord("write".to_string()), "<Expanded macro>".to_owned()),
								Token::new(TokenEnum::Literal{n: ((string_size_u16 >> 8) & 0x00FF) as u8, bit_size: 8}, "<Expanded macro>".to_owned()),
								Token::new(TokenEnum::AssemblyWord("stack-push".to_string()), "<Expanded macro>".to_owned())
							],
							*line_n
						));
					},
					MacroEnum::PushAnchorAddress => {
						let anchor_name = macro_.args[0].to_string();
						let address: u16 = match anchors.get(&anchor_name) {
							Some(prog_address) => (*prog_address as u16).wrapping_sub(1),// TODO
							None => {return Err(ProgramSkeletonBuildError::MacroInvalidAnchor(anchor_name.to_owned()));}
						};
						// GOTO-A
						out.push((vec![
							Token::new(TokenEnum::AssemblyWord("write".to_string()), "<Expanded macro>".to_owned()),
							Token::new(TokenEnum::Literal{n: (address & 0x00FF) as u8, bit_size: 8}, "<Expanded macro>".to_owned()),
							Token::new(TokenEnum::AssemblyWord("stack-push".to_string()), "<Expanded macro>".to_owned())
						], *line_n));
						// GOTO-B
						out.push((vec![
							Token::new(TokenEnum::AssemblyWord("write".to_string()), "<Expanded macro>".to_owned()),
							Token::new(TokenEnum::Literal{n: ((address >> 8) & 0x00FF) as u8, bit_size: 8}, "<Expanded macro>".to_owned()),
							Token::new(TokenEnum::AssemblyWord("stack-push".to_string()), "<Expanded macro>".to_owned())
						], *line_n));
					}
				}
			}
		}
	}
	// Done
	Ok(out)
}

#[derive(Clone)]
pub enum ProgramSkeletonNode {
	/// Represents a macro, (macro name, vec of arguments)
	Macro(Macro),
	/// Simply an instruction, vec of tokens
	Instruction(Vec<Token>)
}

impl ProgramSkeletonNode {
	pub fn instructions_represented(&self) -> u16 {
		match self {
			Self::Macro(macro_) => macro_.instructions_represented(),
			Self::Instruction(_) => 1
		}
	}
}

#[derive(Debug)]
pub enum ProgramSkeletonBuildError {
	ProgramTooLarge(usize),
	BadSyntaxNodeType(SyntaxTreeNodeType),
	MacroArgumentWrongType(MacroArgument),
	MacroInvalidAnchor(String),
	MacroWriteStringArgumentTooLong(usize),
	AnchorRedefinition(String)
}


/// Creates to instructions to load `address` into the goto latches, takes care of subtracting 1 from it to compensate for the computer hardware incrementing it
fn load_goto_instructions(address_og: u16, line_n: usize) -> Vec<(Vec<Token>, usize)> {
	let address = address_og.wrapping_sub(1);// TODO
	// GOTO-A
	let goto_a: Vec<Token> = vec![
		Token::new(TokenEnum::AssemblyWord("write".to_string()), "<Expanded macro>".to_owned()),
		Token::new(TokenEnum::Literal{n: (address & 0x00FF) as u8, bit_size: 8}, "<Expanded macro>".to_owned()),
		Token::new(TokenEnum::AssemblyWord("goto-a".to_string()), "<Expanded macro>".to_owned())
	];
	// GOTO-B
	let goto_b: Vec<Token> = vec![
		Token::new(TokenEnum::AssemblyWord("write".to_string()), "<Expanded macro>".to_owned()),
		Token::new(TokenEnum::Literal{n: ((address >> 8) & 0x00FF) as u8, bit_size: 8}, "<Expanded macro>".to_owned()),
		Token::new(TokenEnum::AssemblyWord("goto-b".to_string()), "<Expanded macro>".to_owned())
	];
	// Done
	vec![(goto_a, line_n), (goto_b, line_n)]
}

/// For expanding call, goto, and goto-f
fn expand_address_set_macro(anchors: &HashMap<String, usize>, anchor_name: &str, assembly_word: String, line_n: usize) -> Result<Vec<(Vec<Token>, usize)>, ProgramSkeletonBuildError> {
	match anchors.get(anchor_name) {
		Some(prog_address) => {
			// Expand macro into vec of instructions
			let mut out: Vec<(Vec<Token>, usize)> = load_goto_instructions(*prog_address as u16, line_n);
			// Call instruction
			out.push((vec![
				Token::new(TokenEnum::AssemblyWord(assembly_word), "<Expanded macro>".to_owned())
			], line_n));
			// Done
			Ok(out)
		},
		None => Err(ProgramSkeletonBuildError::MacroInvalidAnchor(anchor_name.to_owned()))
	}
}