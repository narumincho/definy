pub mod deploy_detector;
pub mod expression_eval;
pub mod preview_detector;
pub mod wasm_emitter;

pub use deploy_detector::{DetectedDeploy, detect_deploy_in_expression};
pub use expression_eval::{Value, evaluate_expression, expression_to_source};
pub use preview_detector::{DetectedPreview, detect_preview_in_expression};

pub type DecodedEvent = Result<
    (ed25519_dalek::Signature, definy_event::event::Event),
    definy_event::VerifyAndDeserializeError,
>;
pub type EventWithHash = (definy_event::EventHashId, DecodedEvent);
