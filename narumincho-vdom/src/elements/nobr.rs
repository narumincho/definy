// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/nobr
pub struct Nobr {}

pub fn nobr() -> Nobr {
    Nobr {}
}
impl Nobr {
    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Nobr(self),
        }
    }
}
