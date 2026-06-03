// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/Heading_Elements
pub struct H1 {

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/Heading_Elements#specifying_a_uniform_font_size_for_h1
    pub no_ua_styles_in_article_aside_nav_section: std::option::Option<String>,
}


pub fn h1() -> H1 {
    H1{
        no_ua_styles_in_article_aside_nav_section: None,
    }
}
impl H1 {
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/Heading_Elements#specifying_a_uniform_font_size_for_h1
    pub fn no_ua_styles_in_article_aside_nav_section(mut self, value: impl Into<String>) -> Self {
        self.no_ua_styles_in_article_aside_nav_section = Some(value.into());
        self
    }

    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes {},
            element_content: super::ElementContent::H1(self),
        }
    }
}
