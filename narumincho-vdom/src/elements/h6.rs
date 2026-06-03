// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/Heading_Elements
pub struct H6 {}

pub fn h6() -> H6 {
    H6 {}
}
impl H6 {
    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::H6(self),
        }
    }
}
