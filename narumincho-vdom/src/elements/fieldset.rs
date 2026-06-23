// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/form-elements.html#the-fieldset-element
pub struct Fieldset {}

pub fn fieldset() -> Fieldset {
    Fieldset {}
}

impl Fieldset {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Fieldset(self),
            children,
        }
    }
}
