// このファイルは narumincho-vdom-build によって自動生成されました。

/// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/article
pub struct Article {}

pub fn article() -> Article {
    Article {}
}
impl Article {
    pub fn to_element(self) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Article(self),
        }
    }
}
