// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://drafts.csswg.org/filter-effects-1/#elementdef-feconvolvematrix
pub struct FeConvolveMatrix {}

pub fn feConvolveMatrix() -> FeConvolveMatrix {
    FeConvolveMatrix {}
}

impl FeConvolveMatrix {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::FeConvolveMatrix(self),
            children,
        }
    }
}
