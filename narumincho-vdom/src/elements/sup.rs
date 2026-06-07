// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/sup
pub struct Sup {}

pub fn sup() -> Sup {
    Sup {}
}
impl Sup {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Sup(self),
            children,
        }
    }
}
