// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/grouping-content.html#menus
pub struct Menu {}

pub fn menu() -> Menu {
    Menu {}
}

impl Menu {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Menu(self),
            children,
        }
    }
}
