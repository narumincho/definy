// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/details
pub struct Details {

    /// 
    pub name: std::option::Option<String>,
    /// 
    pub open: std::option::Option<String>,
    /// 
    pub search_match_opens: std::option::Option<String>,
}


pub fn details() -> Details {
    Details{
        name: None,
        open: None,
        search_match_opens: None,
    }
}
impl Details {
    /// 
    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    /// 
    pub fn open(mut self, value: impl Into<String>) -> Self {
        self.open = Some(value.into());
        self
    }

    /// 
    pub fn search_match_opens(mut self, value: impl Into<String>) -> Self {
        self.search_match_opens = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::Details(self),
        }
    }
}
