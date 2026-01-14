use narumincho_vdom::Node;

pub fn render(node: &Node) -> () {
    let window = web_sys::window().expect("no global `window` exists");
    let document = window.document().expect("should have a document on window");
    let html_element = document
        .document_element()
        .expect("should have a document element");
    html_element.set_inner_html(&narumincho_vdom::to_html(node));
}
