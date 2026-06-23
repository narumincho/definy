// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/forms.html#the-label-element
pub struct Label {}

pub fn label() -> Label {
    Label {}
}

impl Label {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Label(self),
            children,
        }
    }
}
