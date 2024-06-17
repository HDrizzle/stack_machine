//! For loading configuration files

use std::fs;
use serde_json;

use crate::prelude::*;

const ASSEMBLER_CONFIG_DIR: &str = "assembler_config/";
pub const ASSEMBLY_SOURCES_DIR: &str = "assembly_sources/";
pub const OUTPUT_DIR: &str = "out/";

pub fn load_assembler_config() -> Result<AssemblerConfig, String> {
    let path = format!("{}/config.json", ASSEMBLER_CONFIG_DIR);
    let raw_string = to_string_err(fs::read_to_string(&path))?;
    to_string_err(serde_json::from_str(&raw_string))
}