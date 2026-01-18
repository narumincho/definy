#[derive(Debug, PartialEq, Clone)]
pub struct Element<T> {
    pub element_name: String,
    pub attributes: Vec<(String, String)>,
    pub events: Vec<(String, T)>,
    pub children: Vec<Node<T>>,
}

#[derive(Debug, PartialEq, Clone)]
pub enum Node<T> {
    Element(Element<T>),
    Text(String),
}
