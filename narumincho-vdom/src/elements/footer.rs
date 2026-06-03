// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/footer
pub struct Footer {

}


pub fn footer() -> Footer {
    Footer{
    }
}
impl Footer {
    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::Footer(self),
        }
    }
}
