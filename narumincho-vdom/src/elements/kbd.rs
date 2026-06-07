// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/kbd
pub struct Kbd {}

pub fn kbd() -> Kbd {
    Kbd {}
}
impl Kbd {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Kbd(self),
            children,
        }
    }
}
