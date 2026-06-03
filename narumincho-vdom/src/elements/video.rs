// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/video
pub struct Video {
    ///
    pub aspect_ratio_computed_from_attributes: std::option::Option<String>,
    ///
    pub autoplay: std::option::Option<String>,
    ///
    pub controls: std::option::Option<String>,
    ///
    pub controlslist: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/crossorigin
    pub crossorigin: std::option::Option<String>,
    ///
    pub disablepictureinpicture: std::option::Option<String>,
    ///
    pub disableremoteplayback: std::option::Option<String>,
    ///
    pub height: std::option::Option<String>,
    ///
    pub loading: std::option::Option<String>,
    ///
    pub r#loop: std::option::Option<String>,
    ///
    pub muted: std::option::Option<String>,
    ///
    pub playsinline: std::option::Option<String>,
    ///
    pub poster: std::option::Option<String>,
    ///
    pub preload: std::option::Option<String>,
    ///
    pub src: std::option::Option<String>,
    ///
    pub width: std::option::Option<String>,
}

pub fn video() -> Video {
    Video {
        aspect_ratio_computed_from_attributes: None,
        autoplay: None,
        controls: None,
        controlslist: None,
        crossorigin: None,
        disablepictureinpicture: None,
        disableremoteplayback: None,
        height: None,
        loading: None,
        r#loop: None,
        muted: None,
        playsinline: None,
        poster: None,
        preload: None,
        src: None,
        width: None,
    }
}
impl Video {
    ///
    pub fn aspect_ratio_computed_from_attributes(mut self, value: impl Into<String>) -> Self {
        self.aspect_ratio_computed_from_attributes = Some(value.into());
        self
    }

    ///
    pub fn autoplay(mut self, value: impl Into<String>) -> Self {
        self.autoplay = Some(value.into());
        self
    }

    ///
    pub fn controls(mut self, value: impl Into<String>) -> Self {
        self.controls = Some(value.into());
        self
    }

    ///
    pub fn controlslist(mut self, value: impl Into<String>) -> Self {
        self.controlslist = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Attributes/crossorigin
    pub fn crossorigin(mut self, value: impl Into<String>) -> Self {
        self.crossorigin = Some(value.into());
        self
    }

    ///
    pub fn disablepictureinpicture(mut self, value: impl Into<String>) -> Self {
        self.disablepictureinpicture = Some(value.into());
        self
    }

    ///
    pub fn disableremoteplayback(mut self, value: impl Into<String>) -> Self {
        self.disableremoteplayback = Some(value.into());
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
    pub fn r#loop(mut self, value: impl Into<String>) -> Self {
        self.r#loop = Some(value.into());
        self
    }

    ///
    pub fn muted(mut self, value: impl Into<String>) -> Self {
        self.muted = Some(value.into());
        self
    }

    ///
    pub fn playsinline(mut self, value: impl Into<String>) -> Self {
        self.playsinline = Some(value.into());
        self
    }

    ///
    pub fn poster(mut self, value: impl Into<String>) -> Self {
        self.poster = Some(value.into());
        self
    }

    ///
    pub fn preload(mut self, value: impl Into<String>) -> Self {
        self.preload = Some(value.into());
        self
    }

    ///
    pub fn src(mut self, value: impl Into<String>) -> Self {
        self.src = Some(value.into());
        self
    }

    ///
    pub fn width(mut self, value: impl Into<String>) -> Self {
        self.width = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Video(self),
        }
    }
}
