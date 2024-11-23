//! For assembling macros

use crate::prelude::*;
use super::{program_skeleton::ProgramSkeletonBuildError, ParseError, ParseErrorType};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Macro {
    pub type_: MacroEnum,
    /// Arguments given to macro inside parenthesis, length already verified
    pub args: Vec<MacroArgument>
}

impl Macro {
    /// Given a string and starting index, attempts to parse a macro, `start` is assumed by be right after the "@" that denotes the macro
    pub fn parse(source: &Vec<char>, start: usize) -> Result<(Self, usize), ParseError> {
        let mut i: usize = start;
        // First, read macro name
        let (name, new_i) = parse_identifier(source, i, Some(ParseContext::Macro))?;
        // Skip whitespace after macro name
        i = skip_whitespace(source, new_i, Some(ParseContext::Macro))?;
        // Check that next character is "("
        if source[i] != '(' {
            return Err(ParseError::new(i, i+1, ParseErrorType::InvalidCharacterInContext(source[i], ParseContext::Macro), Some("Expected \"(\"".to_string())));
        }
        i += 1;// get past the opening "("
        // Build list of arguments
        let mut args = Vec::<MacroArgument>::new();
        loop {
            // Skip whitespace
            i = skip_whitespace(source, i, Some(ParseContext::Macro))?;
            let mut char_: char = source[i];
            // Check if first character is a quote to begin a string, or an identifier character
            if char_ == '\"' {
                let (string_arg, end) = parse_string_literal(source, i+1)?;
                args.push(MacroArgument::StringLiteral(string_arg));
                i = end;
            }
            // Check if identifier
            if IDENTIFIER_CHARS.contains(&char_) {
                let (arg, new_i) = parse_identifier(source, i, Some(ParseContext::Macro))?;
                i = new_i;
                args.push(MacroArgument::Identifier(arg));
            }
            // Skip whitespace
            i = skip_whitespace(source, i, Some(ParseContext::Macro))?;
            // Check if next character is )
            char_ = source[i];
            if char_ == ')' {
                i += 1;
                break;
            }
            // No other characters are allowed here
            if char_ != ',' {
                return Err(ParseError::new(i, i+1, ParseErrorType::InvalidCharacterInContext(char_, ParseContext::Macro), Some("Expected \",\"".to_string())));
            }
        }
        // Match name with varients of this enum
        let enum_ = MacroEnum::match_identifier(&name, start, i)?;
        let correct_n_args = enum_.num_args();
        if correct_n_args != args.len() {
            return Err(ParseError::new(start, i, ParseErrorType::MacroWrongNumArgs{actual: args.len(), correct: correct_n_args}, None));
        }
        // Done
        Ok((
            Self {
                type_: enum_,
                args
            },
            i
        ))
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum MacroEnum {
    Anchor,
    Call,
    Goto,
    GotoIf
}

impl MacroEnum {
    pub fn num_args(&self) -> usize {
        match self {
            Self::Anchor => 1,
            Self::Call => 1,
            Self::Goto => 1,
            Self::GotoIf => 1,
        }
    }
    /// Assumes that the number of arguments (`Self::num_args()`) has already been checked
    pub fn args_correct_type(&self, args: &Vec<MacroArgument>) -> Result<(), ProgramSkeletonBuildError> {
        match self {
            Self::Anchor => match &args[0] {
                MacroArgument::Identifier(_) => Ok(()),
                invalid => Err(ProgramSkeletonBuildError::MacroArgumentWrongType(invalid.clone()))
            },
            Self::Call => match &args[0] {
                MacroArgument::Identifier(_) => Ok(()),
                invalid => Err(ProgramSkeletonBuildError::MacroArgumentWrongType(invalid.clone()))
            },
            Self::Goto => match &args[0] {
                MacroArgument::Identifier(_) => Ok(()),
                invalid => Err(ProgramSkeletonBuildError::MacroArgumentWrongType(invalid.clone()))
            },
            Self::GotoIf => match &args[0] {
                MacroArgument::Identifier(_) => Ok(()),
                invalid => Err(ProgramSkeletonBuildError::MacroArgumentWrongType(invalid.clone()))
            },
        }
    }
    pub fn match_identifier(id: &str, source_start: usize, source_end: usize) -> Result<Self, ParseError> {
        Ok(match id {
            "anchor" => Self::Anchor,
            "call" => Self::Call,
            "goto" => Self::Goto,
            "goto_if" => Self::GotoIf,
            id => {return Err(ParseError::new(source_start, source_end, ParseErrorType::InvalidMacroIdentifier(id.to_owned()), None));}
        })
    }
    /// Number of instructions represented by this macro
    pub fn instructions_represented(&self) -> u16 {
        match self {
            Self::Anchor => 0,
            Self::Call => 3,
            Self::Goto => 3,
            Self::GotoIf => 3
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum MacroArgument {
    Identifier(String),
    StringLiteral(String)
}

impl MacroArgument {
    pub fn to_string(&self) -> String {
        match &self {
            Self::Identifier(s) => s.clone(),
            Self::StringLiteral(s) => s.clone()
        }
    }
}