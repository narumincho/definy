// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/form-elements.html#the-legend-element
pub struct Legend {}

pub fn legend() -> Legend {
    Legend {}
}

impl Legend {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Legend(self),
            children,
        }
    }
}
