// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/form-elements.html#the-datalist-element
pub struct Datalist {}

pub fn datalist() -> Datalist {
    Datalist {}
}

impl Datalist {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Datalist(self),
            children,
        }
    }
}
