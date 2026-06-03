// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/Heading_Elements
pub struct H3 {}

pub fn h3() -> H3 {
    H3 {}
}
impl H3 {
    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::H3(self),
        }
    }
}
