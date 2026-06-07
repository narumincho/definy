// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/noembed
pub struct Noembed {}

pub fn noembed() -> Noembed {
    Noembed {}
}
impl Noembed {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Noembed(self),
            children,
        }
    }
}
