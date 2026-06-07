// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/bdo
pub struct Bdo {}

pub fn bdo() -> Bdo {
    Bdo {}
}
impl Bdo {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Bdo(self),
            children,
        }
    }
}
