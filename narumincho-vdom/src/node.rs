#[derive(Debug, PartialEq, Clone)]
pub struct Element {
    pub element_name: String,
    pub attributes: Vec<(String, String)>,
    pub children: Vec<Node>,
}

#[derive(Debug, PartialEq, Clone)]
pub enum Node {
    Element(Element),
    Text(String),
}
