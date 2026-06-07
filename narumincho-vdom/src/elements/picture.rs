// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/picture
pub struct Picture {}

pub fn picture() -> Picture {
    Picture {}
}
impl Picture {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Picture(self),
            children,
        }
    }
}
