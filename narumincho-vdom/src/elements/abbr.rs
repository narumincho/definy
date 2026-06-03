// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/abbr
pub struct Abbr {

}


pub fn abbr() -> Abbr {
    Abbr{
    }
}
impl Abbr {
    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::Abbr(self),
        }
    }
}
