//! Program skeleton, created from syntax tree, enable macro expansion

use crate::prelude::*;

use super::{syntax_tree::*, Token};

pub struct ProgramSkeleton {
	/// List of either instructions or macros
	children: Vec<ProgramSkeletonNode>,
	/// Total size
	prog_size: u16
}

impl ProgramSkeleton {
	pub fn build(tree_root: &SyntaxTreeNode) -> Result<Self, ProgramSkeletonBuildError> {
		match &tree_root.type_ {
			SyntaxTreeNodeType::Program => {
				// Iterate over tree root's children
				let mut children = Vec::<ProgramSkeletonNode>::new();
				for tree_node in &tree_root.children {// Top level nodes, right under root
					children.push(match &tree_node.type_ {
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
				for child in &children {
					size_total += child.instructions_represented() as usize;
				}
				if size_total > POWER_16 {
					return Err(ProgramSkeletonBuildError::ProgramTooLarge(size_total));
				}
				// Done
				Ok(Self {
					children,
					prog_size: size_total as u16
				})
			},
			other => Err(ProgramSkeletonBuildError::BadSyntaxNodeType(other.clone()))
		}
	}
}

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

pub enum ProgramSkeletonBuildError {
	ProgramTooLarge(usize),
	BadSyntaxNodeType(SyntaxTreeNodeType)
}