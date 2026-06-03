// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/Heading_Elements
pub struct H2 {

}


pub fn h2() -> H2 {
    H2{
    }
}
impl H2 {
    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::H2(self),
        }
    }
}
