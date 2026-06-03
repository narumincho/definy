// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/strike
pub struct Strike {}

pub fn strike() -> Strike {
    Strike {}
}
impl Strike {
    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Strike(self),
        }
    }
}
