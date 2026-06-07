// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/noscript
pub struct Noscript {}

pub fn noscript() -> Noscript {
    Noscript {}
}
impl Noscript {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Noscript(self),
            children,
        }
    }
}
