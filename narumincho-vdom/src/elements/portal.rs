// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://wicg.github.io/portals/#elementdef-portal
pub struct Portal {}

pub fn portal() -> Portal {
    Portal {}
}

impl Portal {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Portal(self),
            children,
        }
    }
}
