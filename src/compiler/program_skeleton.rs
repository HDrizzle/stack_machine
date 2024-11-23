//! Program skeleton, created from syntax tree, enable macro expansion

use std::collections::HashMap;
use crate::prelude::*;

use super::{assembly_encode::{Token, TokenEnum}, macros::{Macro, MacroArgument,MacroEnum}, syntax_tree::*};

/// Construct a more linear representation of the program as opposed to the syntax tree
/// At this step the final length of the program is now known, which means that @anchor() macros can be assigned addresses and all other macros expanded
pub fn program_skeleton_build(tree_root: &SyntaxTreeNode) -> Result<Vec<Vec<Token>>, ProgramSkeletonBuildError> {
	match &tree_root.type_ {
		SyntaxTreeNodeType::Program => {
			// Iterate over tree root's children
			let mut nodes = Vec::<ProgramSkeletonNode>::new();
			for tree_node in &tree_root.children {// Top level nodes, right under root
				nodes.push(match &tree_node.type_ {
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
						ProgramSkeletonNode::Instruction(tokens)
					},
					SyntaxTreeNodeType::Macro(macro_) => ProgramSkeletonNode::Macro(macro_.clone()),
					invalid => return Err(ProgramSkeletonBuildError::BadSyntaxNodeType(invalid.clone()))
				});
			}
			// Calculate size
			let mut size_total: usize = 0;
			for node in &nodes {
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

fn macro_expansion(nodes: &Vec<ProgramSkeletonNode>) -> Result<Vec<Vec<Token>>, ProgramSkeletonBuildError> {
	let mut nodes_2 = Vec::<ProgramSkeletonNode>::new();
	// Compile anchor addresses and delete anchor
	let mut anchors = HashMap::<String, usize>::new();
	let mut current_program_address: usize = 0;// Address of final instruction, NOT node list index
	for node in nodes {
		match node {
			ProgramSkeletonNode::Instruction(_) => {
				nodes_2.push(node.clone());
			},
			ProgramSkeletonNode::Macro(macro_) => {
				match macro_.type_ {
					MacroEnum::Anchor => {
						// Verify that type of macro's first argument is MacroArgument::Identifier(String)
						match &macro_.args[0] {
							MacroArgument::Identifier(anchor_name) => {
								anchors.insert(anchor_name.clone(), current_program_address);
							},
							invalid => {return Err(ProgramSkeletonBuildError::MacroArgumentWrongType(invalid.clone()));}
						}
					},
					_ => {}// Ignore all other macros for now
				}
			}
		}
		current_program_address += node.instructions_represented() as usize;
	}
	// Expand other macros
	let mut out = Vec::<Vec<Token>>::new();
	for node in nodes {
		match node {
			ProgramSkeletonNode::Instruction(tokens) => {
				out.push(tokens.clone());
			},
			ProgramSkeletonNode::Macro(macro_) => {
				match macro_.type_ {
					MacroEnum::Anchor => {
						panic!("Logic error: Anchor macro encountered during 2nd macro expansion loop")
					},
					MacroEnum::Call => {
						let anchor_name = macro_.args[0].to_string();
						out.append(&mut expand_address_set_macro(&anchors, &anchor_name, "call".to_owned())?);
					},
					MacroEnum::Goto => {
						let anchor_name = macro_.args[0].to_string();
						out.append(&mut expand_address_set_macro(&anchors, &anchor_name, "goto".to_owned())?);
					},
					MacroEnum::GotoIf => {
						let anchor_name = macro_.args[0].to_string();
						out.append(&mut expand_address_set_macro(&anchors, &anchor_name, "goto-if".to_owned())?);
					}
				}
			}
		}
		current_program_address += node.instructions_represented() as usize;
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
			Self::Macro(macro_) => macro_.type_.instructions_represented(),
			Self::Instruction(_) => 1
		}
	}
}

#[derive(Debug)]
pub enum ProgramSkeletonBuildError {
	ProgramTooLarge(usize),
	BadSyntaxNodeType(SyntaxTreeNodeType),
	MacroArgumentWrongType(MacroArgument),
	MacroInvalidAnchor(String)
}


/// Creates to instructions to load `address` into the goto latches, takes care of subtracting 1 from it to compensate for the computer hardware incrementing it
fn load_goto_instructions(address_og: u16) -> Vec<Vec<Token>> {
	let address = address_og - 1;
	// GOTO-A
	let goto_a: Vec<Token> = vec![
		Token::new(TokenEnum::AssemblyWord("write".to_string()), "<Expanded macro>".to_owned()),
		Token::new(TokenEnum::Literal{n: (address & 0x0F) as u8, bit_size: 8}, "<Expanded macro>".to_owned()),
		Token::new(TokenEnum::AssemblyWord("goto-a".to_string()), "<Expanded macro>".to_owned())
	];
	// GOTO-B
	let goto_b: Vec<Token> = vec![
		Token::new(TokenEnum::AssemblyWord("write".to_string()), "<Expanded macro>".to_owned()),
		Token::new(TokenEnum::Literal{n: ((address >> 8) & 0x0F) as u8, bit_size: 8}, "<Expanded macro>".to_owned()),
		Token::new(TokenEnum::AssemblyWord("goto-b".to_string()), "<Expanded macro>".to_owned())
	];
	// Done
	vec![goto_a, goto_b]
}

/// For expanding call, goto, and goto-f
fn expand_address_set_macro(anchors: &HashMap<String, usize>, anchor_name: &str, assembly_word: String) -> Result<Vec<Vec<Token>>, ProgramSkeletonBuildError> {
	match anchors.get(anchor_name) {
		Some(prog_address) => {
			// Expand macro into vec of instructions
			let mut out = load_goto_instructions(*prog_address as u16);
			// Call instruction
			out.push(vec![
				Token::new(TokenEnum::AssemblyWord(assembly_word), "<Expanded macro>".to_owned())
			]);
			// Done
			Ok(out)
		},
		None => Err(ProgramSkeletonBuildError::MacroInvalidAnchor(anchor_name.to_owned()))
	}
}