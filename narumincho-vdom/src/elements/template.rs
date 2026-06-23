// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/scripting.html#the-template-element
pub struct Template {}

pub fn template() -> Template {
    Template {}
}

impl Template {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Template(self),
            children,
        }
    }
}
