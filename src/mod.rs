//! All old stuff that only works for version 1 is on this module and enabled by the `version_1` cargo feature

pub mod compiler;
pub mod emulator;
#[cfg(test)]
mod tests;