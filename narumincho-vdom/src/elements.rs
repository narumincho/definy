// このファイルは narumincho-vdom-build によって自動生成されました。
#![allow(non_snake_case, dead_code)]
pub mod a;
pub mod abbr;
pub mod address;
pub mod animate;
pub mod animateMotion;
pub mod animateTransform;
pub mod annotation;
pub mod annotation_xml;
pub mod area;
pub mod article;
pub mod aside;
pub mod audio;
pub mod b;
pub mod base;
pub mod bdi;
pub mod bdo;
pub mod blockquote;
pub mod body;
pub mod br;
pub mod button;
pub mod canvas;
pub mod caption;
pub mod circle;
pub mod cite;
pub mod clipPath;
pub mod code;
pub mod col;
pub mod colgroup;
pub mod data;
pub mod datalist;
pub mod dd;
pub mod defs;
pub mod del;
pub mod desc;
pub mod details;
pub mod dfn;
pub mod dialog;
pub mod div;
pub mod dl;
pub mod dt;
pub mod ellipse;
pub mod em;
pub mod embed;
pub mod feBlend;
pub mod feColorMatrix;
pub mod feComponentTransfer;
pub mod feComposite;
pub mod feConvolveMatrix;
pub mod feDiffuseLighting;
pub mod feDisplacementMap;
pub mod feDistantLight;
pub mod feDropShadow;
pub mod feFlood;
pub mod feFuncA;
pub mod feFuncB;
pub mod feFuncG;
pub mod feFuncR;
pub mod feGaussianBlur;
pub mod feImage;
pub mod feMerge;
pub mod feMergeNode;
pub mod feMorphology;
pub mod feOffset;
pub mod fePointLight;
pub mod feSpecularLighting;
pub mod feSpotLight;
pub mod feTile;
pub mod feTurbulence;
pub mod fencedframe;
pub mod fieldset;
pub mod figcaption;
pub mod figure;
pub mod filter;
pub mod footer;
pub mod foreignObject;
pub mod form;
pub mod g;
pub mod geolocation;
pub mod h1;
pub mod h2;
pub mod h3;
pub mod h4;
pub mod h5;
pub mod h6;
pub mod head;
pub mod header;
pub mod hgroup;
pub mod hr;
pub mod html;
pub mod i;
pub mod iframe;
pub mod image;
pub mod img;
pub mod input;
pub mod ins;
pub mod kbd;
pub mod label;
pub mod legend;
pub mod li;
pub mod line;
pub mod linearGradient;
pub mod link;
pub mod maction;
pub mod main;
pub mod map;
pub mod mark;
pub mod marker;
pub mod mask;
pub mod math;
pub mod menu;
pub mod merror;
pub mod meta;
pub mod metadata;
pub mod meter;
pub mod mfrac;
pub mod mi;
pub mod mmultiscripts;
pub mod mn;
pub mod mo;
pub mod model;
pub mod mover;
pub mod mpadded;
pub mod mpath;
pub mod mphantom;
pub mod mprescripts;
pub mod mroot;
pub mod mrow;
pub mod ms;
pub mod mspace;
pub mod msqrt;
pub mod mstyle;
pub mod msub;
pub mod msubsup;
pub mod msup;
pub mod mtable;
pub mod mtd;
pub mod mtext;
pub mod mtr;
pub mod munder;
pub mod munderover;
pub mod nav;
pub mod noscript;
pub mod object;
pub mod ol;
pub mod optgroup;
pub mod option;
pub mod output;
pub mod p;
pub mod path;
pub mod pattern;
pub mod picture;
pub mod polygon;
pub mod polyline;
pub mod portal;
pub mod pre;
pub mod progress;
pub mod q;
pub mod radialGradient;
pub mod rb;
pub mod rect;
pub mod rp;
pub mod rt;
pub mod rtc;
pub mod ruby;
pub mod s;
pub mod samp;
pub mod script;
pub mod search;
pub mod section;
pub mod select;
pub mod selectedcontent;
pub mod semantics;
pub mod set;
pub mod slot;
pub mod small;
pub mod source;
pub mod span;
pub mod stop;
pub mod strong;
pub mod style;
pub mod sub;
pub mod summary;
pub mod sup;
pub mod svg;
pub mod r#switch;
pub mod symbol;
pub mod table;
pub mod tbody;
pub mod td;
pub mod template;
pub mod text;
pub mod textPath;
pub mod textarea;
pub mod tfoot;
pub mod th;
pub mod thead;
pub mod time;
pub mod title;
pub mod tr;
pub mod track;
pub mod tspan;
pub mod u;
pub mod ul;
pub mod r#use;
pub mod var;
pub mod video;
pub mod view;
pub mod wbr;

pub enum Node {
    Element(Element),
    Text(String),
}

pub struct Element {
    pub global_attributes: GlobalAttributes,
    pub element_content: ElementContent,
    pub children: Vec<Node>,
}

#[derive(Default)]
pub struct GlobalAttributes {
    pub accesskey: std::option::Option<String>,
    pub autocapitalize: std::option::Option<String>,
    pub autofocus: std::option::Option<String>,
    pub class: std::option::Option<String>,
    pub contenteditable: std::option::Option<String>,
    pub dir: std::option::Option<String>,
    pub draggable: std::option::Option<String>,
    pub enterkeyhint: std::option::Option<String>,
    pub hidden: std::option::Option<String>,
    pub id: std::option::Option<String>,
    pub inert: std::option::Option<String>,
    pub inputmode: std::option::Option<String>,
    pub is: std::option::Option<String>,
    pub lang: std::option::Option<String>,
    pub nonce: std::option::Option<String>,
    pub part: std::option::Option<String>,
    pub popover: std::option::Option<String>,
    pub slot: std::option::Option<String>,
    pub spellcheck: std::option::Option<String>,
    pub style: std::option::Option<String>,
    pub tabindex: std::option::Option<String>,
    pub title: std::option::Option<String>,
    pub translate: std::option::Option<String>,
}

pub enum ElementContent {
    /// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element
    A(a::A),
    /// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-abbr-element
    Abbr(abbr::Abbr),
    /// https://html.spec.whatwg.org/multipage/sections.html#the-address-element
    Address(address::Address),
    /// https://svgwg.org/specs/animations/#elementdef-animate
    Animate(animate::Animate),
    /// https://svgwg.org/specs/animations/#elementdef-animateMotion
    AnimateMotion(animateMotion::AnimateMotion),
    /// https://svgwg.org/specs/animations/#elementdef-animateTransform
    AnimateTransform(animateTransform::AnimateTransform),
    /// https://w3c.github.io/mathml-core/#dfn-annotation
    Annotation(annotation::Annotation),
    /// https://w3c.github.io/mathml-core/#dfn-annotation-xml
    Annotation_xml(annotation_xml::Annotation_xml),
    /// https://html.spec.whatwg.org/multipage/image-maps.html#the-area-element
    Area(area::Area),
    /// https://html.spec.whatwg.org/multipage/sections.html#the-article-element
    Article(article::Article),
    /// https://html.spec.whatwg.org/multipage/sections.html#the-aside-element
    Aside(aside::Aside),
    /// https://html.spec.whatwg.org/multipage/media.html#audio
    Audio(audio::Audio),
    /// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-b-element
    B(b::B),
    /// https://html.spec.whatwg.org/multipage/semantics.html#the-base-element
    Base(base::Base),
    /// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-bdi-element
    Bdi(bdi::Bdi),
    /// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-bdo-element
    Bdo(bdo::Bdo),
    /// https://html.spec.whatwg.org/multipage/grouping-content.html#the-blockquote-element
    Blockquote(blockquote::Blockquote),
    /// https://html.spec.whatwg.org/multipage/sections.html#the-body-element
    Body(body::Body),
    /// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-br-element
    Br(br::Br),
    /// https://html.spec.whatwg.org/multipage/form-elements.html#the-button-element
    Button(button::Button),
    /// https://html.spec.whatwg.org/multipage/canvas.html#canvas
    Canvas(canvas::Canvas),
    /// https://html.spec.whatwg.org/multipage/tables.html#the-caption-element
    Caption(caption::Caption),
    /// https://www.w3.org/TR/SVG11/shapes.html#CircleElement
    Circle(circle::Circle),
    /// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-cite-element
    Cite(cite::Cite),
    /// https://drafts.csswg.org/css-masking-1/#elementdef-clippath
    ClipPath(clipPath::ClipPath),
    /// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-code-element
    Code(code::Code),
    /// https://html.spec.whatwg.org/multipage/tables.html#the-col-element
    Col(col::Col),
    /// https://html.spec.whatwg.org/multipage/tables.html#the-colgroup-element
    Colgroup(colgroup::Colgroup),
    /// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-data-element
    Data(data::Data),
    /// https://html.spec.whatwg.org/multipage/form-elements.html#the-datalist-element
    Datalist(datalist::Datalist),
    /// https://html.spec.whatwg.org/multipage/grouping-content.html#the-dd-element
    Dd(dd::Dd),
    /// https://www.w3.org/TR/SVG11/struct.html#DefsElement
    Defs(defs::Defs),
    /// https://html.spec.whatwg.org/multipage/edits.html#the-del-element
    Del(del::Del),
    /// https://www.w3.org/TR/SVG11/struct.html#DescElement
    Desc(desc::Desc),
    /// https://html.spec.whatwg.org/multipage/interactive-elements.html#the-details-element
    Details(details::Details),
    /// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-dfn-element
    Dfn(dfn::Dfn),
    /// https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element
    Dialog(dialog::Dialog),
    /// https://html.spec.whatwg.org/multipage/grouping-content.html#the-div-element
    Div(div::Div),
    /// https://html.spec.whatwg.org/multipage/grouping-content.html#the-dl-element
    Dl(dl::Dl),
    /// https://html.spec.whatwg.org/multipage/grouping-content.html#the-dt-element
    Dt(dt::Dt),
    /// https://www.w3.org/TR/SVG11/shapes.html#EllipseElement
    Ellipse(ellipse::Ellipse),
    /// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-em-element
    Em(em::Em),
    /// https://html.spec.whatwg.org/multipage/iframe-embed-object.html#the-embed-element
    Embed(embed::Embed),
    /// https://drafts.csswg.org/filter-effects-1/#elementdef-feblend
    FeBlend(feBlend::FeBlend),
    /// https://drafts.csswg.org/filter-effects-1/#elementdef-fecolormatrix
    FeColorMatrix(feColorMatrix::FeColorMatrix),
    /// https://drafts.csswg.org/filter-effects-1/#elementdef-fecomponenttransfer
    FeComponentTransfer(feComponentTransfer::FeComponentTransfer),
    /// https://drafts.csswg.org/filter-effects-1/#elementdef-fecomposite
    FeComposite(feComposite::FeComposite),
    /// https://drafts.csswg.org/filter-effects-1/#elementdef-feconvolvematrix
    FeConvolveMatrix(feConvolveMatrix::FeConvolveMatrix),
    /// https://drafts.csswg.org/filter-effects-1/#elementdef-fediffuselighting
    FeDiffuseLighting(feDiffuseLighting::FeDiffuseLighting),
    /// https://drafts.csswg.org/filter-effects-1/#elementdef-fedisplacementmap
    FeDisplacementMap(feDisplacementMap::FeDisplacementMap),
    /// https://drafts.csswg.org/filter-effects-1/#elementdef-fedistantlight
    FeDistantLight(feDistantLight::FeDistantLight),
    /// https://drafts.csswg.org/filter-effects-1/#elementdef-fedropshadow
    FeDropShadow(feDropShadow::FeDropShadow),
    /// https://drafts.csswg.org/filter-effects-1/#elementdef-feflood
    FeFlood(feFlood::FeFlood),
    /// https://drafts.csswg.org/filter-effects-1/#elementdef-fefunca
    FeFuncA(feFuncA::FeFuncA),
    /// https://drafts.csswg.org/filter-effects-1/#elementdef-fefuncb
    FeFuncB(feFuncB::FeFuncB),
    /// https://drafts.csswg.org/filter-effects-1/#elementdef-fefuncg
    FeFuncG(feFuncG::FeFuncG),
    /// https://drafts.csswg.org/filter-effects-1/#elementdef-fefuncr
    FeFuncR(feFuncR::FeFuncR),
    /// https://drafts.csswg.org/filter-effects-1/#elementdef-fegaussianblur
    FeGaussianBlur(feGaussianBlur::FeGaussianBlur),
    /// https://drafts.csswg.org/filter-effects-1/#elementdef-feimage
    FeImage(feImage::FeImage),
    /// https://drafts.csswg.org/filter-effects-1/#elementdef-femerge
    FeMerge(feMerge::FeMerge),
    /// https://drafts.csswg.org/filter-effects-1/#elementdef-femergenode
    FeMergeNode(feMergeNode::FeMergeNode),
    /// https://drafts.csswg.org/filter-effects-1/#elementdef-femorphology
    FeMorphology(feMorphology::FeMorphology),
    /// https://drafts.csswg.org/filter-effects-1/#elementdef-feoffset
    FeOffset(feOffset::FeOffset),
    /// https://drafts.csswg.org/filter-effects-1/#elementdef-fepointlight
    FePointLight(fePointLight::FePointLight),
    /// https://drafts.csswg.org/filter-effects-1/#elementdef-fespecularlighting
    FeSpecularLighting(feSpecularLighting::FeSpecularLighting),
    /// https://drafts.csswg.org/filter-effects-1/#elementdef-fespotlight
    FeSpotLight(feSpotLight::FeSpotLight),
    /// https://drafts.csswg.org/filter-effects-1/#elementdef-fetile
    FeTile(feTile::FeTile),
    /// https://drafts.csswg.org/filter-effects-1/#elementdef-feturbulence
    FeTurbulence(feTurbulence::FeTurbulence),
    /// https://wicg.github.io/fenced-frame/#elementdef-fencedframe
    Fencedframe(fencedframe::Fencedframe),
    /// https://html.spec.whatwg.org/multipage/form-elements.html#the-fieldset-element
    Fieldset(fieldset::Fieldset),
    /// https://html.spec.whatwg.org/multipage/grouping-content.html#the-figcaption-element
    Figcaption(figcaption::Figcaption),
    /// https://html.spec.whatwg.org/multipage/grouping-content.html#the-figure-element
    Figure(figure::Figure),
    /// https://drafts.csswg.org/filter-effects-1/#elementdef-filter
    Filter(filter::Filter),
    /// https://html.spec.whatwg.org/multipage/sections.html#the-footer-element
    Footer(footer::Footer),
    /// https://www.w3.org/TR/SVG11/extend.html#ForeignObjectElement
    ForeignObject(foreignObject::ForeignObject),
    /// https://html.spec.whatwg.org/multipage/forms.html#the-form-element
    Form(form::Form),
    /// https://www.w3.org/TR/SVG11/struct.html#GElement
    G(g::G),
    /// https://wicg.github.io/PEPC/geolocation-element.html#elementdef-geolocation
    Geolocation(geolocation::Geolocation),
    /// https://html.spec.whatwg.org/multipage/sections.html#the-h1-element
    H1(h1::H1),
    /// https://html.spec.whatwg.org/multipage/sections.html#the-h2-element
    H2(h2::H2),
    /// https://html.spec.whatwg.org/multipage/sections.html#the-h3-element
    H3(h3::H3),
    /// https://html.spec.whatwg.org/multipage/sections.html#the-h4-element
    H4(h4::H4),
    /// https://html.spec.whatwg.org/multipage/sections.html#the-h5-element
    H5(h5::H5),
    /// https://html.spec.whatwg.org/multipage/sections.html#the-h6-element
    H6(h6::H6),
    /// https://html.spec.whatwg.org/multipage/semantics.html#the-head-element
    Head(head::Head),
    /// https://html.spec.whatwg.org/multipage/sections.html#the-header-element
    Header(header::Header),
    /// https://html.spec.whatwg.org/multipage/sections.html#the-hgroup-element
    Hgroup(hgroup::Hgroup),
    /// https://html.spec.whatwg.org/multipage/grouping-content.html#the-hr-element
    Hr(hr::Hr),
    /// https://html.spec.whatwg.org/multipage/semantics.html#the-html-element
    Html(html::Html),
    /// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-i-element
    I(i::I),
    /// https://html.spec.whatwg.org/multipage/iframe-embed-object.html#the-iframe-element
    Iframe(iframe::Iframe),
    /// https://www.w3.org/TR/SVG11/struct.html#ImageElement
    Image(image::Image),
    /// https://html.spec.whatwg.org/multipage/embedded-content.html#the-img-element
    Img(img::Img),
    /// https://html.spec.whatwg.org/multipage/input.html#the-input-element
    Input(input::Input),
    /// https://html.spec.whatwg.org/multipage/edits.html#the-ins-element
    Ins(ins::Ins),
    /// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-kbd-element
    Kbd(kbd::Kbd),
    /// https://html.spec.whatwg.org/multipage/forms.html#the-label-element
    Label(label::Label),
    /// https://html.spec.whatwg.org/multipage/form-elements.html#the-legend-element
    Legend(legend::Legend),
    /// https://html.spec.whatwg.org/multipage/grouping-content.html#the-li-element
    Li(li::Li),
    /// https://www.w3.org/TR/SVG11/shapes.html#LineElement
    Line(line::Line),
    /// https://www.w3.org/TR/SVG11/pservers.html#LinearGradients
    LinearGradient(linearGradient::LinearGradient),
    /// https://html.spec.whatwg.org/multipage/semantics.html#the-link-element
    Link(link::Link),
    /// https://w3c.github.io/mathml-core/#dfn-maction
    Maction(maction::Maction),
    /// https://html.spec.whatwg.org/multipage/grouping-content.html#the-main-element
    Main(main::Main),
    /// https://html.spec.whatwg.org/multipage/image-maps.html#the-map-element
    Map(map::Map),
    /// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-mark-element
    Mark(mark::Mark),
    /// https://www.w3.org/TR/SVG11/painting.html#MarkerElement
    Marker(marker::Marker),
    /// https://drafts.csswg.org/css-masking-1/#elementdef-mask
    Mask(mask::Mask),
    /// https://w3c.github.io/mathml-core/#dfn-math
    Math(math::Math),
    /// https://html.spec.whatwg.org/multipage/grouping-content.html#menus
    Menu(menu::Menu),
    /// https://w3c.github.io/mathml-core/#dfn-merror
    Merror(merror::Merror),
    /// https://html.spec.whatwg.org/multipage/semantics.html#meta
    Meta(meta::Meta),
    /// https://www.w3.org/TR/SVG11/metadata.html#MetadataElement
    Metadata(metadata::Metadata),
    /// https://html.spec.whatwg.org/multipage/form-elements.html#the-meter-element
    Meter(meter::Meter),
    /// https://w3c.github.io/mathml-core/#dfn-mfrac
    Mfrac(mfrac::Mfrac),
    /// https://w3c.github.io/mathml-core/#dfn-mi
    Mi(mi::Mi),
    /// https://w3c.github.io/mathml-core/#dfn-mmultiscripts
    Mmultiscripts(mmultiscripts::Mmultiscripts),
    /// https://w3c.github.io/mathml-core/#dfn-mn
    Mn(mn::Mn),
    /// https://w3c.github.io/mathml-core/#dfn-mo
    Mo(mo::Mo),
    /// https://immersive-web.github.io/model-element/#dfn-model
    Model(model::Model),
    /// https://w3c.github.io/mathml-core/#dfn-mover
    Mover(mover::Mover),
    /// https://w3c.github.io/mathml-core/#dfn-mpadded
    Mpadded(mpadded::Mpadded),
    /// https://svgwg.org/specs/animations/#elementdef-mpath
    Mpath(mpath::Mpath),
    /// https://w3c.github.io/mathml-core/#dfn-mphantom
    Mphantom(mphantom::Mphantom),
    /// https://w3c.github.io/mathml-core/#dfn-mprescripts
    Mprescripts(mprescripts::Mprescripts),
    /// https://w3c.github.io/mathml-core/#dfn-mroot
    Mroot(mroot::Mroot),
    /// https://w3c.github.io/mathml-core/#dfn-mrow
    Mrow(mrow::Mrow),
    /// https://w3c.github.io/mathml-core/#dfn-ms
    Ms(ms::Ms),
    /// https://w3c.github.io/mathml-core/#dfn-mspace
    Mspace(mspace::Mspace),
    /// https://w3c.github.io/mathml-core/#dfn-msqrt
    Msqrt(msqrt::Msqrt),
    /// https://w3c.github.io/mathml-core/#dfn-mstyle
    Mstyle(mstyle::Mstyle),
    /// https://w3c.github.io/mathml-core/#dfn-msub
    Msub(msub::Msub),
    /// https://w3c.github.io/mathml-core/#dfn-msubsup
    Msubsup(msubsup::Msubsup),
    /// https://w3c.github.io/mathml-core/#dfn-msup
    Msup(msup::Msup),
    /// https://w3c.github.io/mathml-core/#dfn-mtable
    Mtable(mtable::Mtable),
    /// https://w3c.github.io/mathml-core/#dfn-mtd
    Mtd(mtd::Mtd),
    /// https://w3c.github.io/mathml-core/#dfn-mtext
    Mtext(mtext::Mtext),
    /// https://w3c.github.io/mathml-core/#dfn-mtr
    Mtr(mtr::Mtr),
    /// https://w3c.github.io/mathml-core/#dfn-munder
    Munder(munder::Munder),
    /// https://w3c.github.io/mathml-core/#dfn-munderover
    Munderover(munderover::Munderover),
    /// https://html.spec.whatwg.org/multipage/sections.html#the-nav-element
    Nav(nav::Nav),
    /// https://html.spec.whatwg.org/multipage/scripting.html#the-noscript-element
    Noscript(noscript::Noscript),
    /// https://html.spec.whatwg.org/multipage/iframe-embed-object.html#the-object-element
    Object(object::Object),
    /// https://html.spec.whatwg.org/multipage/grouping-content.html#the-ol-element
    Ol(ol::Ol),
    /// https://html.spec.whatwg.org/multipage/form-elements.html#the-optgroup-element
    Optgroup(optgroup::Optgroup),
    /// https://html.spec.whatwg.org/multipage/form-elements.html#the-option-element
    Option(option::Option),
    /// https://html.spec.whatwg.org/multipage/form-elements.html#the-output-element
    Output(output::Output),
    /// https://html.spec.whatwg.org/multipage/grouping-content.html#the-p-element
    P(p::P),
    /// https://svgwg.org/specs/paths/#elementdef-path
    Path(path::Path),
    /// https://www.w3.org/TR/SVG11/pservers.html#Patterns
    Pattern(pattern::Pattern),
    /// https://html.spec.whatwg.org/multipage/embedded-content.html#the-picture-element
    Picture(picture::Picture),
    /// https://www.w3.org/TR/SVG11/shapes.html#PolygonElement
    Polygon(polygon::Polygon),
    /// https://www.w3.org/TR/SVG11/shapes.html#PolylineElement
    Polyline(polyline::Polyline),
    /// https://wicg.github.io/portals/#elementdef-portal
    Portal(portal::Portal),
    /// https://html.spec.whatwg.org/multipage/grouping-content.html#the-pre-element
    Pre(pre::Pre),
    /// https://html.spec.whatwg.org/multipage/form-elements.html#the-progress-element
    Progress(progress::Progress),
    /// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-q-element
    Q(q::Q),
    /// https://www.w3.org/TR/SVG11/pservers.html#RadialGradients
    RadialGradient(radialGradient::RadialGradient),
    /// https://w3c.github.io/html-ruby/#elementdef-rb
    Rb(rb::Rb),
    /// https://www.w3.org/TR/SVG11/shapes.html#RectElement
    Rect(rect::Rect),
    /// https://w3c.github.io/html-ruby/#elementdef-rp
    Rp(rp::Rp),
    /// https://w3c.github.io/html-ruby/#elementdef-rt
    Rt(rt::Rt),
    /// https://w3c.github.io/html-ruby/#elementdef-rtc
    Rtc(rtc::Rtc),
    /// https://w3c.github.io/html-ruby/#elementdef-ruby
    Ruby(ruby::Ruby),
    /// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-s-element
    S(s::S),
    /// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-samp-element
    Samp(samp::Samp),
    /// https://html.spec.whatwg.org/multipage/scripting.html#script
    Script(script::Script),
    /// https://html.spec.whatwg.org/multipage/grouping-content.html#the-search-element
    Search(search::Search),
    /// https://html.spec.whatwg.org/multipage/sections.html#the-section-element
    Section(section::Section),
    /// https://html.spec.whatwg.org/multipage/form-elements.html#the-select-element
    Select(select::Select),
    /// https://html.spec.whatwg.org/multipage/form-elements.html#the-selectedcontent-element
    Selectedcontent(selectedcontent::Selectedcontent),
    /// https://w3c.github.io/mathml-core/#dfn-semantics
    Semantics(semantics::Semantics),
    /// https://svgwg.org/specs/animations/#elementdef-set
    Set(set::Set),
    /// https://html.spec.whatwg.org/multipage/scripting.html#the-slot-element
    Slot(slot::Slot),
    /// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-small-element
    Small(small::Small),
    /// https://html.spec.whatwg.org/multipage/embedded-content.html#the-source-element
    Source(source::Source),
    /// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-span-element
    Span(span::Span),
    /// https://www.w3.org/TR/SVG11/pservers.html#GradientStops
    Stop(stop::Stop),
    /// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-strong-element
    Strong(strong::Strong),
    /// https://html.spec.whatwg.org/multipage/semantics.html#the-style-element
    Style(style::Style),
    /// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-sub-element
    Sub(sub::Sub),
    /// https://html.spec.whatwg.org/multipage/interactive-elements.html#the-summary-element
    Summary(summary::Summary),
    /// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-sup-element
    Sup(sup::Sup),
    /// https://www.w3.org/TR/SVG11/struct.html#SVGElement
    Svg(svg::Svg),
    /// https://www.w3.org/TR/SVG11/struct.html#SwitchElement
    Switch(r#switch::Switch),
    /// https://www.w3.org/TR/SVG11/struct.html#SymbolElement
    Symbol(symbol::Symbol),
    /// https://html.spec.whatwg.org/multipage/tables.html#the-table-element
    Table(table::Table),
    /// https://html.spec.whatwg.org/multipage/tables.html#the-tbody-element
    Tbody(tbody::Tbody),
    /// https://html.spec.whatwg.org/multipage/tables.html#the-td-element
    Td(td::Td),
    /// https://html.spec.whatwg.org/multipage/scripting.html#the-template-element
    Template(template::Template),
    /// https://www.w3.org/TR/SVG11/text.html#TextElement
    Text(text::Text),
    /// https://www.w3.org/TR/SVG11/text.html#TextPathElement
    TextPath(textPath::TextPath),
    /// https://html.spec.whatwg.org/multipage/form-elements.html#the-textarea-element
    Textarea(textarea::Textarea),
    /// https://html.spec.whatwg.org/multipage/tables.html#the-tfoot-element
    Tfoot(tfoot::Tfoot),
    /// https://html.spec.whatwg.org/multipage/tables.html#the-th-element
    Th(th::Th),
    /// https://html.spec.whatwg.org/multipage/tables.html#the-thead-element
    Thead(thead::Thead),
    /// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-time-element
    Time(time::Time),
    /// https://html.spec.whatwg.org/multipage/semantics.html#the-title-element
    Title(title::Title),
    /// https://html.spec.whatwg.org/multipage/tables.html#the-tr-element
    Tr(tr::Tr),
    /// https://html.spec.whatwg.org/multipage/media.html#the-track-element
    Track(track::Track),
    /// https://www.w3.org/TR/SVG11/text.html#TSpanElement
    Tspan(tspan::Tspan),
    /// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-u-element
    U(u::U),
    /// https://html.spec.whatwg.org/multipage/grouping-content.html#the-ul-element
    Ul(ul::Ul),
    /// https://www.w3.org/TR/SVG11/struct.html#UseElement
    Use(r#use::Use),
    /// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-var-element
    Var(var::Var),
    /// https://html.spec.whatwg.org/multipage/media.html#video
    Video(video::Video),
    /// https://www.w3.org/TR/SVG11/linking.html#ViewElement
    View(view::View),
    /// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-wbr-element
    Wbr(wbr::Wbr),
}
impl Element {
    pub fn accesskey(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.accesskey = Some(value.into());
        self
    }

    pub fn autocapitalize(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.autocapitalize = Some(value.into());
        self
    }

    pub fn autofocus(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.autofocus = Some(value.into());
        self
    }

    pub fn class(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.class = Some(value.into());
        self
    }

    pub fn contenteditable(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.contenteditable = Some(value.into());
        self
    }

    pub fn dir(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.dir = Some(value.into());
        self
    }

    pub fn draggable(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.draggable = Some(value.into());
        self
    }

    pub fn enterkeyhint(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.enterkeyhint = Some(value.into());
        self
    }

    pub fn hidden(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.hidden = Some(value.into());
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.id = Some(value.into());
        self
    }

    pub fn inert(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.inert = Some(value.into());
        self
    }

    pub fn inputmode(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.inputmode = Some(value.into());
        self
    }

    pub fn is(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.is = Some(value.into());
        self
    }

    pub fn lang(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.lang = Some(value.into());
        self
    }

    pub fn nonce(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.nonce = Some(value.into());
        self
    }

    pub fn part(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.part = Some(value.into());
        self
    }

    pub fn popover(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.popover = Some(value.into());
        self
    }

    pub fn slot(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.slot = Some(value.into());
        self
    }

    pub fn spellcheck(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.spellcheck = Some(value.into());
        self
    }

    pub fn style(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.style = Some(value.into());
        self
    }

    pub fn tabindex(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.tabindex = Some(value.into());
        self
    }

    pub fn title(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.title = Some(value.into());
        self
    }

    pub fn translate(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.translate = Some(value.into());
        self
    }
}
