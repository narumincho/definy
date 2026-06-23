// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/image-maps.html#the-area-element
pub struct Area {}

pub fn area() -> Area {
    Area {}
}

impl Area {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Area(self),
            children,
        }
    }
}
