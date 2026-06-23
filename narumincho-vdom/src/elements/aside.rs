// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/sections.html#the-aside-element
pub struct Aside {}

pub fn aside() -> Aside {
    Aside {}
}

impl Aside {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Aside(self),
            children,
        }
    }
}
