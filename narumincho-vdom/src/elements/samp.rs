// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/samp
pub struct Samp {}

pub fn samp() -> Samp {
    Samp {}
}
impl Samp {
    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Samp(self),
        }
    }
}
