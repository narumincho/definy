// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/iframe
pub struct Iframe {

    /// 
    pub align: std::option::Option<String>,
    /// 
    pub allow: std::option::Option<String>,
    /// 
    pub allowfullscreen: std::option::Option<String>,
    /// 
    pub allowpaymentrequest: std::option::Option<String>,
    /// 
    pub browsingtopics: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTTP/Guides/IFrame_credentialless
    pub credentialless: std::option::Option<String>,
    /// 
    pub cross_origin_top_navigation_by_user_activation: std::option::Option<String>,
    /// 
    pub csp: std::option::Option<String>,
    /// 
    pub frameborder: std::option::Option<String>,
    /// 
    pub height: std::option::Option<String>,
    /// 
    pub loading: std::option::Option<String>,
    /// 
    pub longdesc: std::option::Option<String>,
    /// 
    pub marginheight: std::option::Option<String>,
    /// 
    pub marginwidth: std::option::Option<String>,
    /// 
    pub name: std::option::Option<String>,
    /// 
    pub privateToken: std::option::Option<String>,
    /// 
    pub referrerpolicy: std::option::Option<String>,
    /// 
    pub sandbox: std::option::Option<String>,
    /// 
    pub scrolling: std::option::Option<String>,
    /// 
    pub src: std::option::Option<String>,
    /// 
    pub srcdoc: std::option::Option<String>,
    /// 
    pub width: std::option::Option<String>,
}


pub fn iframe() -> Iframe {
    Iframe{
        align: None,
        allow: None,
        allowfullscreen: None,
        allowpaymentrequest: None,
        browsingtopics: None,
        credentialless: None,
        cross_origin_top_navigation_by_user_activation: None,
        csp: None,
        frameborder: None,
        height: None,
        loading: None,
        longdesc: None,
        marginheight: None,
        marginwidth: None,
        name: None,
        privateToken: None,
        referrerpolicy: None,
        sandbox: None,
        scrolling: None,
        src: None,
        srcdoc: None,
        width: None,
    }
}
impl Iframe {
    /// 
    pub fn align(mut self, value: impl Into<String>) -> Self {
        self.align = Some(value.into());
        self
    }

    /// 
    pub fn allow(mut self, value: impl Into<String>) -> Self {
        self.allow = Some(value.into());
        self
    }

    /// 
    pub fn allowfullscreen(mut self, value: impl Into<String>) -> Self {
        self.allowfullscreen = Some(value.into());
        self
    }

    /// 
    pub fn allowpaymentrequest(mut self, value: impl Into<String>) -> Self {
        self.allowpaymentrequest = Some(value.into());
        self
    }

    /// 
    pub fn browsingtopics(mut self, value: impl Into<String>) -> Self {
        self.browsingtopics = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTTP/Guides/IFrame_credentialless
    pub fn credentialless(mut self, value: impl Into<String>) -> Self {
        self.credentialless = Some(value.into());
        self
    }

    /// 
    pub fn cross_origin_top_navigation_by_user_activation(mut self, value: impl Into<String>) -> Self {
        self.cross_origin_top_navigation_by_user_activation = Some(value.into());
        self
    }

    /// 
    pub fn csp(mut self, value: impl Into<String>) -> Self {
        self.csp = Some(value.into());
        self
    }

    /// 
    pub fn frameborder(mut self, value: impl Into<String>) -> Self {
        self.frameborder = Some(value.into());
        self
    }

    /// 
    pub fn height(mut self, value: impl Into<String>) -> Self {
        self.height = Some(value.into());
        self
    }

    /// 
    pub fn loading(mut self, value: impl Into<String>) -> Self {
        self.loading = Some(value.into());
        self
    }

    /// 
    pub fn longdesc(mut self, value: impl Into<String>) -> Self {
        self.longdesc = Some(value.into());
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
    pub fn privateToken(mut self, value: impl Into<String>) -> Self {
        self.privateToken = Some(value.into());
        self
    }

    /// 
    pub fn referrerpolicy(mut self, value: impl Into<String>) -> Self {
        self.referrerpolicy = Some(value.into());
        self
    }

    /// 
    pub fn sandbox(mut self, value: impl Into<String>) -> Self {
        self.sandbox = Some(value.into());
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

    /// 
    pub fn srcdoc(mut self, value: impl Into<String>) -> Self {
        self.srcdoc = Some(value.into());
        self
    }

    /// 
    pub fn width(mut self, value: impl Into<String>) -> Self {
        self.width = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::Iframe(self),
        }
    }
}
