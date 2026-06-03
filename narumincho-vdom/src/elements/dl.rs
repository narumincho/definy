// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/dl
pub struct Dl {

}


pub fn dl() -> Dl {
    Dl{
    }
}
impl Dl {
    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::Dl(self),
        }
    }
}
