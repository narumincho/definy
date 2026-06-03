// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/data
pub struct Data {

    /// 
    pub value: std::option::Option<String>,
}


pub fn data() -> Data {
    Data{
        value: None,
    }
}
impl Data {
    /// 
    pub fn value(mut self, value: impl Into<String>) -> Self {
        self.value = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::Data(self),
        }
    }
}
