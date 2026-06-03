// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/aside
pub struct Aside {

}


pub fn aside() -> Aside {
    Aside{
    }
}
impl Aside {
    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::Aside(self),
        }
    }
}
