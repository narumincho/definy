// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://wicg.github.io/fenced-frame/#elementdef-fencedframe
pub struct Fencedframe {}

pub fn fencedframe() -> Fencedframe {
    Fencedframe {}
}

impl Fencedframe {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Fencedframe(self),
            children,
        }
    }
}
