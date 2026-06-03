// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/time
pub struct Time {

    /// 
    pub datetime: std::option::Option<String>,
}


pub fn time() -> Time {
    Time{
        datetime: None,
    }
}
impl Time {
    /// 
    pub fn datetime(mut self, value: impl Into<String>) -> Self {
        self.datetime = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::Time(self),
        }
    }
}
