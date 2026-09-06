use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use surrealdb::Surreal;
use surrealdb::engine::any::Any;

use crate::AppState;
use crate::error::ApiError;

pub struct Database(pub Surreal<Any>);

impl FromRequestParts<AppState> for Database {
    type Rejection = ApiError;

    async fn from_request_parts(
        _parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let db = crate::ensure_db(state)
            .await
            .ok_or(ApiError::DatabaseUnavailable)?;
        Ok(Self(db))
    }
}
