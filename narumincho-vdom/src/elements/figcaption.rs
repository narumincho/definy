// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/figcaption
pub struct Figcaption {

}


pub fn figcaption() -> Figcaption {
    Figcaption{
    }
}
impl Figcaption {
    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::Figcaption(self),
        }
    }
}
