// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/script
pub struct Script {

    /// 
    pub r#async: std::option::Option<String>,
    /// 
    pub attributionsrc: std::option::Option<String>,
    /// 
    pub blocking: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/crossorigin
    pub crossorigin: std::option::Option<String>,
    /// 
    pub defer: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/fetchpriority
    pub fetchpriority: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/integrity
    pub integrity: std::option::Option<String>,
    /// 
    pub nomodule: std::option::Option<String>,
    /// 
    pub referrerpolicy: std::option::Option<String>,
    /// 
    pub src: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/script/type
    pub r#type: std::option::Option<String>,
}


pub fn script() -> Script {
    Script{
        r#async: None,
        attributionsrc: None,
        blocking: None,
        crossorigin: None,
        defer: None,
        fetchpriority: None,
        integrity: None,
        nomodule: None,
        referrerpolicy: None,
        src: None,
        r#type: None,
    }
}
impl Script {
    /// 
    pub fn r#async(mut self, value: impl Into<String>) -> Self {
        self.r#async = Some(value.into());
        self
    }

    /// 
    pub fn attributionsrc(mut self, value: impl Into<String>) -> Self {
        self.attributionsrc = Some(value.into());
        self
    }

    /// 
    pub fn blocking(mut self, value: impl Into<String>) -> Self {
        self.blocking = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/crossorigin
    pub fn crossorigin(mut self, value: impl Into<String>) -> Self {
        self.crossorigin = Some(value.into());
        self
    }

    /// 
    pub fn defer(mut self, value: impl Into<String>) -> Self {
        self.defer = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/fetchpriority
    pub fn fetchpriority(mut self, value: impl Into<String>) -> Self {
        self.fetchpriority = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/integrity
    pub fn integrity(mut self, value: impl Into<String>) -> Self {
        self.integrity = Some(value.into());
        self
    }

    /// 
    pub fn nomodule(mut self, value: impl Into<String>) -> Self {
        self.nomodule = Some(value.into());
        self
    }

    /// 
    pub fn referrerpolicy(mut self, value: impl Into<String>) -> Self {
        self.referrerpolicy = Some(value.into());
        self
    }

    /// 
    pub fn src(mut self, value: impl Into<String>) -> Self {
        self.src = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/script/type
    pub fn r#type(mut self, value: impl Into<String>) -> Self {
        self.r#type = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::Script(self),
        }
    }
}
