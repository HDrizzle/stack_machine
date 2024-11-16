//! For assembling macros

use crate::prelude::*;
use std::fmt::Write;

pub enum Macro {
    Anchor(String),
    Call(String),
    Goto(String),
    GotoIf(String)
}

impl Macro {
    /// Given a string and starting index, attempts to parse a macro, `start_index` is assumed by be right after the "@" that denotes the macro
    pub fn parse(s: &str, start_index: usize) -> Result<Self, MacroParseError> {
        let mut paren_level: usize = 0;
        let mut awaiting_paren_end: bool = false;
        let mut args_unparsed = Vec::<String>::new();
        let mut name = String::new();
        let mut inside_parens_start_opt: Option<usize> = None;
        // First, parse name
        for(i, char_) in s[start_index..s.len()].chars().into_iter().enumerate() {
            if char_ == '(' {
                inside_parens_start = Some(i + start_index);
                break;
            }
            if IDENTIFIER_CHARS.contains(&char_) {
                name.write_char(char_);
            }
            else {
                return Err(MacroParseError::DisallowedCharacter(char_));
            }
        }
        // Check that inside_parens_start_opt is set, if it isn't then the name parse loop did not get to any opening perenthisies
        match inside_parens_start_opt {
            Some(inside_parens_start) => {
                // TODO
            },
            None => {
                Err(MacroParseError::Unfinished)
            }
        }
        // Done
        Err(MacroParseError::WrongNumArgs{actual: 0, correct: 0})// TODO
    }
    /// Number of instructions represented by this macro
    pub fn instructions_represented(&self) -> usize {
        match self {
            Self::Anchor(_) => 0,
            Self::Call(_) => 3,
            Self::Goto(_) => 3,
            Self::GotoIf(_) => 3
        }
    }
}

pub enum MacroParseError {
    DisallowedCharacter(char),
    WrongNumArgs{
        actual: usize,
        correct: usize
    },
    Unfinished
}