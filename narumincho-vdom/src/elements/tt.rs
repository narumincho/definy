// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/tt
pub struct Tt {

}


pub fn tt() -> Tt {
    Tt{
    }
}
impl Tt {
    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::Tt(self),
        }
    }
}
