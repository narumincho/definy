// このファイルは narumincho-vdom-build によって自動生成されました。
pub mod a;
pub mod abbr;
pub mod acronym;
pub mod address;
pub mod area;
pub mod article;
pub mod aside;
pub mod audio;
pub mod b;
pub mod base;
pub mod bdi;
pub mod bdo;
pub mod big;
pub mod blockquote;
pub mod body;
pub mod br;
pub mod button;
pub mod canvas;
pub mod caption;
pub mod center;
pub mod cite;
pub mod code;
pub mod col;
pub mod colgroup;
pub mod data;
pub mod datalist;
pub mod dd;
pub mod del;
pub mod details;
pub mod dfn;
pub mod dialog;
pub mod dir;
pub mod div;
pub mod dl;
pub mod dt;
pub mod em;
pub mod embed;
pub mod fencedframe;
pub mod fieldset;
pub mod figcaption;
pub mod figure;
pub mod font;
pub mod footer;
pub mod form;
pub mod frame;
pub mod frameset;
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
pub mod img;
pub mod input;
pub mod ins;
pub mod kbd;
pub mod label;
pub mod legend;
pub mod li;
pub mod link;
pub mod main;
pub mod map;
pub mod mark;
pub mod marquee;
pub mod menu;
pub mod meta;
pub mod meter;
pub mod nav;
pub mod nobr;
pub mod noembed;
pub mod noframes;
pub mod noscript;
pub mod object;
pub mod ol;
pub mod optgroup;
pub mod option;
pub mod output;
pub mod p;
pub mod param;
pub mod picture;
pub mod plaintext;
pub mod pre;
pub mod progress;
pub mod q;
pub mod rb;
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
pub mod slot;
pub mod small;
pub mod source;
pub mod span;
pub mod strike;
pub mod strong;
pub mod style;
pub mod sub;
pub mod summary;
pub mod sup;
pub mod table;
pub mod tbody;
pub mod td;
pub mod template;
pub mod textarea;
pub mod tfoot;
pub mod th;
pub mod thead;
pub mod time;
pub mod title;
pub mod tr;
pub mod track;
pub mod tt;
pub mod u;
pub mod ul;
pub mod var;
pub mod video;
pub mod wbr;
pub mod xmp;

pub struct Element {
    pub global_attributes: GlobalAttributes,
    pub element_content: ElementContent,
}

pub struct GlobalAttributes {
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/inert
    pub inert: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/exportparts
    pub exportparts: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/id
    pub id: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/popover
    pub popover: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/accesskey
    pub accesskey: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/autocapitalize
    pub autocapitalize: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/autofocus
    pub autofocus: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/dir
    pub dir: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/hidden
    pub hidden: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/data-*
    pub data_attributes: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/class
    pub class: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/tabindex
    pub tabindex: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/title
    pub title: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/translate
    pub translate: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/lang
    pub lang: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/autocorrect
    pub autocorrect: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/is
    pub is: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/nonce
    pub nonce: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/spellcheck
    pub spellcheck: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/virtualkeyboardpolicy
    pub virtualkeyboardpolicy: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/inputmode
    pub inputmode: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/part
    pub part: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/slot
    pub slot: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/draggable
    pub draggable: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/anchor
    pub anchor: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/enterkeyhint
    pub enterkeyhint: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/contenteditable
    pub contenteditable: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/writingsuggestions
    pub writingsuggestions: std::option::Option<String>,
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/style
    pub style: std::option::Option<String>,
}

pub enum ElementContent {
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/search
    Search(search::Search),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/dir
    Dir(dir::Dir),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/form
    Form(form::Form),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/meta
    Meta(meta::Meta),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/samp
    Samp(samp::Samp),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/iframe
    Iframe(iframe::Iframe),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/address
    Address(address::Address),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/map
    Map(map::Map),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/dfn
    Dfn(dfn::Dfn),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/picture
    Picture(picture::Picture),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/slot
    Slot(slot::Slot),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/sup
    Sup(sup::Sup),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/i
    I(i::I),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/tt
    Tt(tt::Tt),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/hr
    Hr(hr::Hr),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/strike
    Strike(strike::Strike),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/sub
    Sub(sub::Sub),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/track
    Track(track::Track),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/wbr
    Wbr(wbr::Wbr),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/acronym
    Acronym(acronym::Acronym),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/param
    Param(param::Param),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/label
    Label(label::Label),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/legend
    Legend(legend::Legend),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/article
    Article(article::Article),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/em
    Em(em::Em),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/footer
    Footer(footer::Footer),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/plaintext
    Plaintext(plaintext::Plaintext),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/strong
    Strong(strong::Strong),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/area
    Area(area::Area),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/body
    Body(body::Body),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/s
    S(s::S),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/option
    Option(option::Option),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/dd
    Dd(dd::Dd),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/colgroup
    Colgroup(colgroup::Colgroup),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/bdi
    Bdi(bdi::Bdi),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/video
    Video(video::Video),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/abbr
    Abbr(abbr::Abbr),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/Heading_Elements
    H3(h3::H3),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/pre
    Pre(pre::Pre),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/meter
    Meter(meter::Meter),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/template
    Template(template::Template),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/embed
    Embed(embed::Embed),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/dt
    Dt(dt::Dt),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/noframes
    Noframes(noframes::Noframes),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/object
    Object(object::Object),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/progress
    Progress(progress::Progress),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/script
    Script(script::Script),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/fencedframe
    Fencedframe(fencedframe::Fencedframe),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/nav
    Nav(nav::Nav),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/caption
    Caption(caption::Caption),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/rp
    Rp(rp::Rp),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/Heading_Elements
    H1(h1::H1),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/code
    Code(code::Code),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/header
    Header(header::Header),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/head
    Head(head::Head),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/noscript
    Noscript(noscript::Noscript),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/datalist
    Datalist(datalist::Datalist),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/thead
    Thead(thead::Thead),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/optgroup
    Optgroup(optgroup::Optgroup),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/del
    Del(del::Del),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/button
    Button(button::Button),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/style
    Style(style::Style),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/td
    Td(td::Td),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/source
    Source(source::Source),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/rb
    Rb(rb::Rb),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/li
    Li(li::Li),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/hgroup
    Hgroup(hgroup::Hgroup),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/summary
    Summary(summary::Summary),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/Heading_Elements
    H4(h4::H4),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/Heading_Elements
    H2(h2::H2),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/html
    Html(html::Html),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/frame
    Frame(frame::Frame),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/textarea
    Textarea(textarea::Textarea),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/Heading_Elements
    H6(h6::H6),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/nobr
    Nobr(nobr::Nobr),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/geolocation
    Geolocation(geolocation::Geolocation),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/noembed
    Noembed(noembed::Noembed),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/section
    Section(section::Section),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/tr
    Tr(tr::Tr),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/data
    Data(data::Data),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/var
    Var(var::Var),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/input
    Input(input::Input),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/selectedcontent
    Selectedcontent(selectedcontent::Selectedcontent),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/ruby
    Ruby(ruby::Ruby),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/tbody
    Tbody(tbody::Tbody),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/aside
    Aside(aside::Aside),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/base
    Base(base::Base),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/details
    Details(details::Details),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/cite
    Cite(cite::Cite),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/figure
    Figure(figure::Figure),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/rt
    Rt(rt::Rt),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/time
    Time(time::Time),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/ul
    Ul(ul::Ul),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/main
    Main(main::Main),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/ol
    Ol(ol::Ol),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/rtc
    Rtc(rtc::Rtc),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/dl
    Dl(dl::Dl),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/fieldset
    Fieldset(fieldset::Fieldset),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/img
    Img(img::Img),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/center
    Center(center::Center),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/xmp
    Xmp(xmp::Xmp),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/ins
    Ins(ins::Ins),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/a
    A(a::A),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/span
    Span(span::Span),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/figcaption
    Figcaption(figcaption::Figcaption),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/small
    Small(small::Small),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/menu
    Menu(menu::Menu),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/u
    U(u::U),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/Heading_Elements
    H5(h5::H5),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/table
    Table(table::Table),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/blockquote
    Blockquote(blockquote::Blockquote),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/canvas
    Canvas(canvas::Canvas),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/font
    Font(font::Font),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/title
    Title(title::Title),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/col
    Col(col::Col),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/big
    Big(big::Big),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/q
    Q(q::Q),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/select
    Select(select::Select),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/p
    P(p::P),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/div
    Div(div::Div),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/dialog
    Dialog(dialog::Dialog),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/marquee
    Marquee(marquee::Marquee),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/th
    Th(th::Th),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/mark
    Mark(mark::Mark),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/audio
    Audio(audio::Audio),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/link
    Link(link::Link),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/kbd
    Kbd(kbd::Kbd),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/output
    Output(output::Output),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/tfoot
    Tfoot(tfoot::Tfoot),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/br
    Br(br::Br),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/bdo
    Bdo(bdo::Bdo),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/frameset
    Frameset(frameset::Frameset),
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Elements/b
    B(b::B),
}
impl Element {
    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/inert
    pub fn inert(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.inert = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/exportparts
    pub fn exportparts(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.exportparts = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/id
    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.id = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/popover
    pub fn popover(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.popover = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/accesskey
    pub fn accesskey(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.accesskey = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/autocapitalize
    pub fn autocapitalize(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.autocapitalize = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/autofocus
    pub fn autofocus(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.autofocus = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/dir
    pub fn dir(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.dir = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/hidden
    pub fn hidden(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.hidden = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/data-*
    pub fn data_attributes(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.data_attributes = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/class
    pub fn class(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.class = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/tabindex
    pub fn tabindex(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.tabindex = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/title
    pub fn title(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.title = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/translate
    pub fn translate(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.translate = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/lang
    pub fn lang(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.lang = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/autocorrect
    pub fn autocorrect(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.autocorrect = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/is
    pub fn is(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.is = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/nonce
    pub fn nonce(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.nonce = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/spellcheck
    pub fn spellcheck(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.spellcheck = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/virtualkeyboardpolicy
    pub fn virtualkeyboardpolicy(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.virtualkeyboardpolicy = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/inputmode
    pub fn inputmode(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.inputmode = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/part
    pub fn part(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.part = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/slot
    pub fn slot(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.slot = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/draggable
    pub fn draggable(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.draggable = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/anchor
    pub fn anchor(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.anchor = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/enterkeyhint
    pub fn enterkeyhint(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.enterkeyhint = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/contenteditable
    pub fn contenteditable(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.contenteditable = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/writingsuggestions
    pub fn writingsuggestions(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.writingsuggestions = Some(value.into());
        self
    }

    /// https://developer.mozilla.org/docs/Web/HTML/Reference/Global_attributes/style
    pub fn style(mut self, value: impl Into<String>) -> Self {
        self.global_attributes.style = Some(value.into());
        self
    }
}
