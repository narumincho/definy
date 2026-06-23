// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://w3c.github.io/mathml-core/#dfn-annotation-xml
pub struct Annotation_xml {}

pub fn annotation_xml() -> Annotation_xml {
    Annotation_xml {}
}

impl Annotation_xml {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Annotation_xml(self),
            children,
        }
    }
}
