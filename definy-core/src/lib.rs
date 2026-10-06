pub mod expression_eval;
pub mod wasm_emitter;

pub use expression_eval::{Value, evaluate_expression, expression_to_source};

pub type DecodedEvent = Result<
    (ed25519_dalek::Signature, definy_event::event::Event),
    definy_event::VerifyAndDeserializeError,
>;
pub type EventWithHash = (definy_event::EventHashId, DecodedEvent);
