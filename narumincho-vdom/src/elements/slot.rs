// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/slot
pub struct Slot {

    /// 
    pub name: std::option::Option<String>,
}


pub fn slot() -> Slot {
    Slot{
        name: None,
    }
}
impl Slot {
    /// 
    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::Slot(self),
        }
    }
}
