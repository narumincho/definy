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

pub fn h(
    element_name: &str,
    attributes: impl Into<Vec<(String, String)>>,
    children: impl Into<Vec<Node>>,
) -> Node {
    Node::Element(Element {
        element_name: element_name.to_string(),
        attributes: attributes.into(),
        children: children.into(),
    })
}

pub fn text(text: impl Into<String>) -> Node {
    Node::Text(text.into())
}

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/html
pub fn html(attributes: impl Into<Vec<(String, String)>>, children: impl Into<Vec<Node>>) -> Node {
    h("html", attributes, children)
}

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/head
pub fn head(attributes: impl Into<Vec<(String, String)>>, children: impl Into<Vec<Node>>) -> Node {
    h("head", attributes, children)
}

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/body
pub fn body(attributes: impl Into<Vec<(String, String)>>, children: impl Into<Vec<Node>>) -> Node {
    h("body", attributes, children)
}

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/title
pub fn title(attributes: impl Into<Vec<(String, String)>>, children: impl Into<Vec<Node>>) -> Node {
    h("title", attributes, children)
}

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/link
pub fn link(attributes: impl Into<Vec<(String, String)>>, children: impl Into<Vec<Node>>) -> Node {
    h("link", attributes, children)
}

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/script
pub fn script(
    attributes: impl Into<Vec<(String, String)>>,
    children: impl Into<Vec<Node>>,
) -> Node {
    h("script", attributes, children)
}

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/h1
pub fn h1(attributes: impl Into<Vec<(String, String)>>, children: impl Into<Vec<Node>>) -> Node {
    h("h1", attributes, children)
}

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/button
pub fn button(
    attributes: impl Into<Vec<(String, String)>>,
    children: impl Into<Vec<Node>>,
) -> Node {
    h("button", attributes, children)
}

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/dialog
pub fn dialog(
    attributes: impl Into<Vec<(String, String)>>,
    children: impl Into<Vec<Node>>,
) -> Node {
    h("dialog", attributes, children)
}

pub struct Button {
    pub attributes: Vec<(String, String)>,
    pub children: Vec<Node>,
}

impl Button {
    pub fn new() -> Self {
        Self {
            attributes: Vec::new(),
            children: Vec::new(),
        }
    }

    pub fn command_for(mut self, command_for: &str) -> Self {
        self.attributes
            .push(("commandFor".to_string(), command_for.to_string()));
        self
    }

    pub fn command(mut self, command: &str) -> Self {
        self.attributes
            .push(("command".to_string(), command.to_string()));
        self
    }

    pub fn type_(mut self, type_: &str) -> Self {
        self.attributes
            .push(("type".to_string(), type_.to_string()));
        self
    }

    pub fn children(mut self, children: impl Into<Vec<Node>>) -> Self {
        self.children = children.into();
        self
    }

    pub fn into_node(self) -> Node {
        button(self.attributes, self.children)
    }
}

impl Into<Node> for Button {
    fn into(self) -> Node {
        button(self.attributes, self.children)
    }
}

impl Into<Node> for String {
    fn into(self) -> Node {
        text(self)
    }
}

pub fn to_html(node: &Node) -> String {
    "<!doctype html>".to_string() + &to_string(node)
}

pub fn to_string(node: &Node) -> String {
    match node {
        Node::Element(vdom) => {
            let mut html = String::new();
            html.push('<');
            html.push_str(&vdom.element_name);
            for (key, value) in &vdom.attributes {
                html.push(' ');
                html.push_str(key);
                html.push_str("=\"");
                html.push_str(&attribute_escape(value));
                html.push('"');
            }
            html.push('>');
            for child in &vdom.children {
                html.push_str(&to_string(child));
            }
            html.push_str("</");
            html.push_str(&vdom.element_name);
            html.push('>');
            html
        }
        Node::Text(text) => text_escape(text),
    }
}

fn attribute_escape(text: &str) -> String {
    text.replace("&", "&amp;")
        .replace("\"", "&quot;")
        .replace("'", "&#39;")
}

fn text_escape(text: &str) -> String {
    text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
}

#[derive(Debug, PartialEq, Clone)]
pub enum Patch {
    Replace(Node),
    UpdateText(String),
    AddAttributes(Vec<(String, String)>),
    RemoveAttributes(Vec<String>),
    AppendChildren(Vec<Node>),
    RemoveChildren(usize),
}

pub fn diff(old_node: &Node, new_node: &Node) -> Vec<(Vec<usize>, Patch)> {
    let mut patches = Vec::new();
    diff_recursive(old_node, new_node, &mut Vec::new(), &mut patches);
    patches
}

fn diff_recursive(
    old_node: &Node,
    new_node: &Node,
    path: &mut Vec<usize>,
    patches: &mut Vec<(Vec<usize>, Patch)>,
) {
    match (old_node, new_node) {
        (Node::Element(old_element), Node::Element(new_element)) => {
            if old_element.element_name != new_element.element_name {
                patches.push((path.clone(), Patch::Replace(new_node.clone())));
                return;
            }

            // Diff attributes
            let mut add_attributes = Vec::new();
            let mut remove_attributes = Vec::new();

            for (key, value) in &new_element.attributes {
                match old_element
                    .attributes
                    .iter()
                    .find(|(old_key, _)| old_key == key)
                {
                    Some((_, old_value)) => {
                        if old_value != value {
                            add_attributes.push((key.clone(), value.clone()));
                        }
                    }
                    None => {
                        add_attributes.push((key.clone(), value.clone()));
                    }
                }
            }

            for (key, _) in &old_element.attributes {
                if !new_element
                    .attributes
                    .iter()
                    .any(|(new_key, _)| new_key == key)
                {
                    remove_attributes.push(key.clone());
                }
            }

            if !add_attributes.is_empty() {
                patches.push((path.clone(), Patch::AddAttributes(add_attributes)));
            }
            if !remove_attributes.is_empty() {
                patches.push((path.clone(), Patch::RemoveAttributes(remove_attributes)));
            }

            // Diff children
            let common_len = std::cmp::min(old_element.children.len(), new_element.children.len());
            for i in 0..common_len {
                path.push(i);
                diff_recursive(
                    &old_element.children[i],
                    &new_element.children[i],
                    path,
                    patches,
                );
                path.pop();
            }

            if new_element.children.len() > old_element.children.len() {
                patches.push((
                    path.clone(),
                    Patch::AppendChildren(
                        new_element.children[old_element.children.len()..].to_vec(),
                    ),
                ));
            } else if new_element.children.len() < old_element.children.len() {
                patches.push((
                    path.clone(),
                    Patch::RemoveChildren(old_element.children.len() - new_element.children.len()),
                ));
            }
        }
        (Node::Text(old_text), Node::Text(new_text)) => {
            if old_text != new_text {
                patches.push((path.clone(), Patch::UpdateText(new_text.clone())));
            }
        }
        _ => {
            patches.push((path.clone(), Patch::Replace(new_node.clone())));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_render_with_attributes() {
        let node = h(
            "div",
            vec![("class".to_string(), "container".to_string())],
            vec![text("hello")],
        );
        assert_eq!(to_string(&node), "<div class=\"container\">hello</div>");
    }

    #[test]
    fn test_render_with_escaped_attributes() {
        let node = h(
            "input",
            vec![("value".to_string(), "a \" b".to_string())],
            vec![],
        );
        assert_eq!(to_string(&node), "<input value=\"a &quot; b\"></input>");
    }

    #[test]
    fn test_diff_text() {
        let old = text("hello");
        let new = text("world");
        let patches = diff(&old, &new);
        assert_eq!(
            patches,
            vec![(vec![], Patch::UpdateText("world".to_string()))]
        );
    }

    #[test]
    fn test_diff_attributes() {
        let old = h(
            "div",
            vec![
                ("class".to_string(), "container".to_string()),
                ("id".to_string(), "test".to_string()),
            ],
            vec![],
        );
        let new = h(
            "div",
            vec![
                ("class".to_string(), "wrapper".to_string()),
                ("style".to_string(), "color: red".to_string()),
            ],
            vec![],
        );
        let patches = diff(&old, &new);

        // Order of patches might depend on implementation detail, so we just check containment or specific structure
        // But since we can rely on our implementation:
        // class changed, id removed, style added.

        // Given the implementation loops over new attributes then old attributes.
        // New loop:
        // class: old has it ("container"), new is "wrapper" -> AddAttributes("class", "wrapper") (Wait, logic says Update is AddAttributes)
        // style: old doesn't have it -> AddAttributes("style", "color: red")
        // Old loop:
        // class: new has it.
        // id: new doesn't have it -> RemoveAttributes("id")

        // Patches order: AddAttributes (multiple?), RemoveAttributes.
        // AddAttributes collects all additions.

        let expected_add = vec![
            ("class".to_string(), "wrapper".to_string()),
            ("style".to_string(), "color: red".to_string()),
        ];
        let expected_remove = vec!["id".to_string()];

        // Since my implementation pushes separate patches for AddAttributes and RemoveAttributes
        // And AddAttributes aggregates all additions in one patch.

        assert_eq!(patches.len(), 2);
        // We can't strictly guarantee order of keys in "AddAttributes" unless we sort or the input was sorted.
        // But here inputs are Vecs, so order is preserved.

        match &patches[0] {
            (path, Patch::AddAttributes(attrs)) => {
                assert_eq!(*path, vec![]);
                assert_eq!(attrs, &expected_add);
            }
            _ => panic!("Expected AddAttributes first"),
        }

        match &patches[1] {
            (path, Patch::RemoveAttributes(attrs)) => {
                assert_eq!(*path, vec![]);
                assert_eq!(attrs, &expected_remove);
            }
            _ => panic!("Expected RemoveAttributes second"),
        }
    }

    #[test]
    fn test_diff_children_replace() {
        let old = h("div", vec![], vec![text("hello")]);
        let new = h("div", vec![], vec![text("world")]);
        let patches = diff(&old, &new);
        assert_eq!(
            patches,
            vec![(vec![0], Patch::UpdateText("world".to_string()))]
        );
    }

    #[test]
    fn test_diff_children_append() {
        let old = h("div", vec![], vec![text("hello")]);
        let new = h("div", vec![], vec![text("hello"), text("world")]);
        let patches = diff(&old, &new);
        assert_eq!(
            patches,
            vec![(vec![], Patch::AppendChildren(vec![text("world")]))]
        );
    }

    #[test]
    fn test_diff_children_remove() {
        let old = h("div", vec![], vec![text("hello"), text("world")]);
        let new = h("div", vec![], vec![text("hello")]);
        let patches = diff(&old, &new);
        assert_eq!(patches, vec![(vec![], Patch::RemoveChildren(1))]);
    }

    #[test]
    fn test_diff_recursive() {
        let old = h("div", vec![], vec![h("span", vec![], vec![text("hello")])]);
        let new = h("div", vec![], vec![h("span", vec![], vec![text("world")])]);
        let patches = diff(&old, &new);
        assert_eq!(
            patches,
            vec![(vec![0, 0], Patch::UpdateText("world".to_string()))]
        );
    }
}
