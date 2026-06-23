// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/tables.html#the-tfoot-element
pub struct Tfoot {}

pub fn tfoot() -> Tfoot {
    Tfoot {}
}

impl Tfoot {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Tfoot(self),
            children,
        }
    }
}
