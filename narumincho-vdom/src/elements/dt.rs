// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/dt
pub struct Dt {}

pub fn dt() -> Dt {
    Dt {}
}
impl Dt {
    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Dt(self),
        }
    }
}
