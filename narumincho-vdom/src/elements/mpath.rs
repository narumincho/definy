// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://svgwg.org/specs/animations/#elementdef-mpath
pub struct Mpath {}

pub fn mpath() -> Mpath {
    Mpath {}
}

impl Mpath {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Mpath(self),
            children,
        }
    }
}
