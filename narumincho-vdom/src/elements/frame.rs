// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/frame
pub struct Frame {
    ///
    pub frameborder: std::option::Option<String>,
    ///
    pub marginheight: std::option::Option<String>,
    ///
    pub marginwidth: std::option::Option<String>,
    ///
    pub name: std::option::Option<String>,
    ///
    pub noresize: std::option::Option<String>,
    ///
    pub scrolling: std::option::Option<String>,
    ///
    pub src: std::option::Option<String>,
}

pub fn frame() -> Frame {
    Frame {
        frameborder: None,
        marginheight: None,
        marginwidth: None,
        name: None,
        noresize: None,
        scrolling: None,
        src: None,
    }
}
impl Frame {
    ///
    pub fn frameborder(mut self, value: impl Into<String>) -> Self {
        self.frameborder = Some(value.into());
        self
    }

    ///
    pub fn marginheight(mut self, value: impl Into<String>) -> Self {
        self.marginheight = Some(value.into());
        self
    }

    ///
    pub fn marginwidth(mut self, value: impl Into<String>) -> Self {
        self.marginwidth = Some(value.into());
        self
    }

    ///
    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    ///
    pub fn noresize(mut self, value: impl Into<String>) -> Self {
        self.noresize = Some(value.into());
        self
    }

    ///
    pub fn scrolling(mut self, value: impl Into<String>) -> Self {
        self.scrolling = Some(value.into());
        self
    }

    ///
    pub fn src(mut self, value: impl Into<String>) -> Self {
        self.src = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Frame(self),
        }
    }
}
