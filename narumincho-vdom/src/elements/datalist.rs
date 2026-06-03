// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/datalist
pub struct Datalist {

    /// 
    pub input_type_color: std::option::Option<String>,
    /// 
    pub input_type_date: std::option::Option<String>,
    /// 
    pub input_type_email: std::option::Option<String>,
    /// 
    pub input_type_number: std::option::Option<String>,
    /// 
    pub input_type_range: std::option::Option<String>,
    /// 
    pub input_type_search: std::option::Option<String>,
    /// 
    pub input_type_tel: std::option::Option<String>,
    /// 
    pub input_type_text: std::option::Option<String>,
    /// 
    pub input_type_time: std::option::Option<String>,
    /// 
    pub input_type_url: std::option::Option<String>,
}


pub fn datalist() -> Datalist {
    Datalist{
        input_type_color: None,
        input_type_date: None,
        input_type_email: None,
        input_type_number: None,
        input_type_range: None,
        input_type_search: None,
        input_type_tel: None,
        input_type_text: None,
        input_type_time: None,
        input_type_url: None,
    }
}
impl Datalist {
    /// 
    pub fn input_type_color(mut self, value: impl Into<String>) -> Self {
        self.input_type_color = Some(value.into());
        self
    }

    /// 
    pub fn input_type_date(mut self, value: impl Into<String>) -> Self {
        self.input_type_date = Some(value.into());
        self
    }

    /// 
    pub fn input_type_email(mut self, value: impl Into<String>) -> Self {
        self.input_type_email = Some(value.into());
        self
    }

    /// 
    pub fn input_type_number(mut self, value: impl Into<String>) -> Self {
        self.input_type_number = Some(value.into());
        self
    }

    /// 
    pub fn input_type_range(mut self, value: impl Into<String>) -> Self {
        self.input_type_range = Some(value.into());
        self
    }

    /// 
    pub fn input_type_search(mut self, value: impl Into<String>) -> Self {
        self.input_type_search = Some(value.into());
        self
    }

    /// 
    pub fn input_type_tel(mut self, value: impl Into<String>) -> Self {
        self.input_type_tel = Some(value.into());
        self
    }

    /// 
    pub fn input_type_text(mut self, value: impl Into<String>) -> Self {
        self.input_type_text = Some(value.into());
        self
    }

    /// 
    pub fn input_type_time(mut self, value: impl Into<String>) -> Self {
        self.input_type_time = Some(value.into());
        self
    }

    /// 
    pub fn input_type_url(mut self, value: impl Into<String>) -> Self {
        self.input_type_url = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::Datalist(self),
        }
    }
}
