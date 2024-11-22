//! Program skeleton, created from syntax tree, enable macro expansion

use std::collections::HashMap;
use crate::prelude::*;

use super::{syntax_tree::*, Token, macros::{Macro, MacroArgument,MacroEnum}};

pub struct ProgramSkeleton {
	/// List of either instructions or macros
	nodes: Vec<ProgramSkeletonNode>,
	/// Total size
	prog_size: u16
}

impl ProgramSkeleton {
	/// Construct a more linear representation of the program as opposed to the syntax tree
	/// At this step the final length of the program is now known, which means that @anchor() macros can be assigned addresses and all other macros expanded
	pub fn build(tree_root: &SyntaxTreeNode) -> Result<Self, ProgramSkeletonBuildError> {
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
				// Macro expansion
				nodes = Self::macro_expansion(&nodes)?;
				// Done
				Ok(Self {
					nodes,
					prog_size: size_total as u16
				})
			},
			other => Err(ProgramSkeletonBuildError::BadSyntaxNodeType(other.clone()))
		}
	}
	fn macro_expansion(nodes: &Vec<ProgramSkeletonNode>) -> Result<Vec<ProgramSkeletonNode>, ProgramSkeletonBuildError> {
		let mut out = Vec::<ProgramSkeletonNode>::new();
		// Compile anchor addresses and delete anchor
		let mut anchors = HashMap::<String, usize>::new();
		let mut current_program_address: usize = 0;// Address of final instruction, NOT node list index
		for node in nodes {
			match node {
				ProgramSkeletonNode::Instruction(i) => {
					out.push(node.clone());
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
		// TODO
		// Done
		Ok(out)
	}
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