// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/dfn
pub struct Dfn {}

pub fn dfn() -> Dfn {
    Dfn {}
}
impl Dfn {
    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Dfn(self),
        }
    }
}
