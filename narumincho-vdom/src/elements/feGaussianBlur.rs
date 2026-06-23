// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://drafts.csswg.org/filter-effects-1/#elementdef-fegaussianblur
pub struct FeGaussianBlur {}

pub fn feGaussianBlur() -> FeGaussianBlur {
    FeGaussianBlur {}
}

impl FeGaussianBlur {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::FeGaussianBlur(self),
            children,
        }
    }
}
