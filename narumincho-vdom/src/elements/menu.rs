// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/menu
pub struct Menu {

}


pub fn menu() -> Menu {
    Menu{
    }
}
impl Menu {
    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::Menu(self),
        }
    }
}
