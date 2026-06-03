// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/mark
pub struct Mark {

}


pub fn mark() -> Mark {
    Mark{
    }
}
impl Mark {
    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::Mark(self),
        }
    }
}
