// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/hgroup
pub struct Hgroup {}

pub fn hgroup() -> Hgroup {
    Hgroup {}
}
impl Hgroup {
    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Hgroup(self),
        }
    }
}
