// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/Heading_Elements
pub struct H4 {

}


pub fn h4() -> H4 {
    H4{
    }
}
impl H4 {
    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::H4(self),
        }
    }
}
