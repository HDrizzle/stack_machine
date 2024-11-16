//! Generics for building an Abstract Syntax Tree

// Traits
/*pub trait ParseErrorType {
    fn explanation(&self) -> String;
}

pub trait ParseError<TErrType: ParseErrorType> {
    fn string_begin_index(&self) -> usize;
    fn string_end_index(&self) -> usize;
    fn error_type(&self) -> TErrType;
    fn format(&self, _source: &str) -> String {
        self.error_type().explanation()// TODO
    }
}

pub trait ParseTreeNodeType<TContext: ParseContext<TNodeType: ParseTreeNodeType, TErr: ParseError<TErrType>, TErrType: ParseErrorType>, TNodeType: ParseTreeNodeType, TErr: ParseError<TErrType>, TErrType: ParseErrorType> {
    fn children_parse_context(&self)
    fn to_string(&self) -> String;
}

pub trait ParseContext<TNodeType: ParseTreeNodeType, TErr: ParseError<TErrType>, TErrType: ParseErrorType> {
    fn to_string(&self) -> String;
    fn parse(&self, _source: &str) -> Result<Vec<TNodeType>, Vec<TErr>>;
}

// Structs
struct ParseTreeNode<TNodeType: ParseTreeNodeType> {
	type_: TNodeType,
	/// Inclusive
	begin: usize,
	/// Exclusive
	end: usize,
	children: Vec<Self>
}

impl ParseTreeNode<TNodeType: ParseTreeNodeType, TContext: ParseContext, TErr: ParseError<TErrType>, TErrType: ParseErrorType> {
	pub fn parse(&self, _source: &str, context: TContext) -> Result<Vec<Self>, Vec<TErr>> {
        let _ = context;
        // TODO
    }
}*/