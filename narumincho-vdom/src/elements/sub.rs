// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/sub
pub struct Sub {

}


pub fn sub() -> Sub {
    Sub{
    }
}
impl Sub {
    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::Sub(self),
        }
    }
}
