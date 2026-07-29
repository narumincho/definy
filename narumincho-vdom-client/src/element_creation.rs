// このファイルは narumincho-vdom-build によって自動生成されました。

pub fn create_element(name: &str, is_svg: bool) -> web_sys::Element {
    if is_svg || is_svg_element_only(name) {
        crate::DOCUMENT
            .create_element_ns(Some("http://www.w3.org/2000/svg"), name)
            .unwrap()
    } else if is_mathml_element_only(name) {
        crate::DOCUMENT
            .create_element_ns(Some("http://www.w3.org/1998/Math/MathML"), name)
            .unwrap()
    } else {
        crate::DOCUMENT.create_element(name).unwrap()
    }
}


fn is_svg_element_only(name: &str) -> bool {
    match name {
        "animate" => true,
        "animateMotion" => true,
        "animateTransform" => true,
        "circle" => true,
        "clipPath" => true,
        "defs" => true,
        "desc" => true,
        "ellipse" => true,
        "feBlend" => true,
        "feColorMatrix" => true,
        "feComponentTransfer" => true,
        "feComposite" => true,
        "feConvolveMatrix" => true,
        "feDiffuseLighting" => true,
        "feDisplacementMap" => true,
        "feDistantLight" => true,
        "feFlood" => true,
        "feFuncA" => true,
        "feFuncB" => true,
        "feFuncG" => true,
        "feFuncR" => true,
        "feGaussianBlur" => true,
        "feImage" => true,
        "feMerge" => true,
        "feMergeNode" => true,
        "feMorphology" => true,
        "feOffset" => true,
        "fePointLight" => true,
        "feSpecularLighting" => true,
        "feSpotLight" => true,
        "feTile" => true,
        "feTurbulence" => true,
        "filter" => true,
        "foreignObject" => true,
        "g" => true,
        "image" => true,
        "line" => true,
        "linearGradient" => true,
        "marker" => true,
        "mask" => true,
        "metadata" => true,
        "mpath" => true,
        "path" => true,
        "pattern" => true,
        "polygon" => true,
        "polyline" => true,
        "radialGradient" => true,
        "rect" => true,
        "set" => true,
        "stop" => true,
        "svg" => true,
        "switch" => true,
        "symbol" => true,
        "text" => true,
        "textPath" => true,
        "tspan" => true,
        "use" => true,
        "view" => true,
        _ => false,
    }
}

fn is_mathml_element_only(name: &str) -> bool {
    match name {
        "annotation" => true,
        "annotation-xml" => true,
        "maction" => true,
        "math" => true,
        "merror" => true,
        "mfrac" => true,
        "mi" => true,
        "mmultiscripts" => true,
        "mn" => true,
        "mo" => true,
        "mover" => true,
        "mpadded" => true,
        "mphantom" => true,
        "mprescripts" => true,
        "mroot" => true,
        "mrow" => true,
        "ms" => true,
        "mspace" => true,
        "msqrt" => true,
        "mstyle" => true,
        "msub" => true,
        "msubsup" => true,
        "msup" => true,
        "mtable" => true,
        "mtd" => true,
        "mtext" => true,
        "mtr" => true,
        "munder" => true,
        "munderover" => true,
        "semantics" => true,
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_element_namespaces() {
        // SVG only elements
        assert!(is_svg_element_only("path"));
        assert!(is_svg_element_only("rect"));
        assert!(is_svg_element_only("circle"));
        assert!(is_svg_element_only("svg"));

        // Overlapping tags (should NOT be SVG-only or MathML-only)
        assert!(!is_svg_element_only("a"));
        assert!(!is_svg_element_only("script"));
        assert!(!is_svg_element_only("style"));
        assert!(!is_svg_element_only("title"));

        // MathML elements
        assert!(is_mathml_element_only("math"));
        assert!(is_mathml_element_only("mfrac"));
        assert!(is_mathml_element_only("mi"));

        // HTML elements (should not be SVG-only or MathML-only)
        assert!(!is_svg_element_only("div"));
        assert!(!is_svg_element_only("span"));
        assert!(!is_mathml_element_only("div"));
        assert!(!is_mathml_element_only("span"));
    }
}
