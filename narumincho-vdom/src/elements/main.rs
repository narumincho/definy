// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/grouping-content.html#the-main-element
pub struct Main {}

pub fn main() -> Main {
    Main {}
}

impl Main {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Main(self),
            children,
        }
    }
}
