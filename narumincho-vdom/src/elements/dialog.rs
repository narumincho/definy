// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/dialog
pub struct Dialog {
    ///
    pub closedby: std::option::Option<String>,
    ///
    pub open: std::option::Option<String>,
}

pub fn dialog() -> Dialog {
    Dialog {
        closedby: None,
        open: None,
    }
}
impl Dialog {
    ///
    pub fn closedby(mut self, value: impl Into<String>) -> Self {
        self.closedby = Some(value.into());
        self
    }

    ///
    pub fn open(mut self, value: impl Into<String>) -> Self {
        self.open = Some(value.into());
        self
    }

    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Dialog(self),
            children,
        }
    }
}
