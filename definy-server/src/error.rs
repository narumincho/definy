use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use utoipa::IntoResponses;

#[derive(Debug, IntoResponses)]
pub enum ApiError {
    #[response(status = 503, description = "Database is unavailable")]
    DatabaseUnavailable,

    #[response(
        status = 400,
        description = "Invalid request format or CBOR parse error"
    )]
    BadRequest(String),

    #[response(status = 404, description = "Resource not found")]
    NotFound,

    #[response(status = 500, description = "Internal server error")]
    Internal(String),
}

impl std::fmt::Display for ApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::DatabaseUnavailable => write!(f, "Database is unavailable"),
            Self::BadRequest(msg) => write!(f, "Bad Request: {}", msg),
            Self::NotFound => write!(f, "Not Found"),
            Self::Internal(msg) => write!(f, "Internal Server Error: {}", msg),
        }
    }
}

impl std::error::Error for ApiError {}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        match self {
            Self::DatabaseUnavailable => (
                StatusCode::SERVICE_UNAVAILABLE,
                [("Content-Type", "text/plain; charset=utf-8")],
                "Database is unavailable",
            )
                .into_response(),
            Self::BadRequest(msg) => (
                StatusCode::BAD_REQUEST,
                [("Content-Type", "text/plain; charset=utf-8")],
                msg,
            )
                .into_response(),
            Self::NotFound => (
                StatusCode::NOT_FOUND,
                [("Content-Type", "text/plain; charset=utf-8")],
                "404 Not Found",
            )
                .into_response(),
            Self::Internal(msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                [("Content-Type", "text/plain; charset=utf-8")],
                msg,
            )
                .into_response(),
        }
    }
}
