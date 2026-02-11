//! All stuff that only works for version 2 is on this module and enabled by the `version_2` cargo feature

pub mod compiler;
pub mod emulator;
#[cfg(test)]
mod tests;