// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://www.w3.org/TR/SVG11/shapes.html#RectElement
pub struct Rect {}

pub fn rect() -> Rect {
    Rect {}
}

impl Rect {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Rect(self),
            children,
        }
    }
}
