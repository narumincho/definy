// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/wbr
pub struct Wbr {}

pub fn wbr() -> Wbr {
    Wbr {}
}
impl Wbr {
    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Wbr(self),
        }
    }
}
