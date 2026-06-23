// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://drafts.csswg.org/filter-effects-1/#elementdef-feturbulence
pub struct FeTurbulence {}

pub fn feTurbulence() -> FeTurbulence {
    FeTurbulence {}
}

impl FeTurbulence {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::FeTurbulence(self),
            children,
        }
    }
}
