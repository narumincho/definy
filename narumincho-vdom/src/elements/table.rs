// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]

/// https://html.spec.whatwg.org/multipage/tables.html#the-table-element
pub struct Table {}

pub fn table() -> Table {
    Table {}
}

impl Table {
    pub fn to_element(self, children: Vec<super::Node>) -> super::Element {
        super::Element {
            global_attributes: super::GlobalAttributes::default(),
            element_content: super::ElementContent::Table(self),
            children,
        }
    }
}
