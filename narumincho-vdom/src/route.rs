pub trait Route: Sized {
    fn to_url(&self) -> String;
    fn from_url(url: &str) -> Option<Self>;
}

pub enum Href<L: Route> {
    External(String),
    Internal(L),
}

impl<L: Route> From<Href<L>> for String {
    fn from(val: Href<L>) -> Self {
        match val {
            Href::External(url) => url,
            Href::Internal(location) => location.to_url(),
        }
    }
}
