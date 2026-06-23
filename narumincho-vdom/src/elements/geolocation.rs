// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://wicg.github.io/PEPC/geolocation-element.html#elementdef-geolocation
pub struct Geolocation {}

pub fn geolocation() -> Geolocation {
    Geolocation {}
}

impl Geolocation {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Geolocation(self),
            children,
        }
    }
}
