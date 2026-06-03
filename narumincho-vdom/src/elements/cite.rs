// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/cite
pub struct Cite {}

pub fn cite() -> Cite {
    Cite {}
}
impl Cite {
    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Cite(self),
        }
    }
}
