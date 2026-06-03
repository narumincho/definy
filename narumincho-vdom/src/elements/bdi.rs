// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/bdi
pub struct Bdi {

}


pub fn bdi() -> Bdi {
    Bdi{
    }
}
impl Bdi {
    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::Bdi(self),
        }
    }
}
