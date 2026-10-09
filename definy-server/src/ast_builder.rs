use definy_event::EventHashId;
use definy_event::event::{
    CallArgument, CallExpression, Expression, FunctionExpression, FunctionParameter,
    FunctionParameterType, PartReferenceExpression, PartType,
};

#[allow(dead_code)]
pub fn fn_expr(params: &[(&str, i64)], body: Expression) -> Expression {
    Expression::Function(FunctionExpression {
        parameters: params
            .iter()
            .map(|(name, id)| FunctionParameter {
                parameter_id: *id,
                parameter_name: (*name).into(),
            })
            .collect(),
        body: Box::new(body),
    })
}

#[allow(dead_code)]
pub fn call_expr(function: Expression, args: &[(&str, Expression)]) -> Expression {
    Expression::Call(CallExpression {
        function: Box::new(function),
        arguments: args
            .iter()
            .map(|(name, val)| CallArgument {
                name: (*name).into(),
                value: Box::new(val.clone()),
            })
            .collect(),
    })
}

#[allow(dead_code)]
pub fn call_part(
    part_hash: impl std::borrow::Borrow<EventHashId>,
    args: &[(&str, Expression)],
) -> Expression {
    call_expr(
        Expression::PartReference(PartReferenceExpression::new(part_hash.borrow().clone())),
        args,
    )
}

#[allow(dead_code)]
pub fn fn_type(params: &[(&str, PartType)], return_type: PartType) -> PartType {
    PartType::Function {
        parameters: params
            .iter()
            .map(|(name, t)| FunctionParameterType {
                name: (*name).into(),
                r#type: Box::new(t.clone()),
            })
            .collect(),
        return_type: Box::new(return_type),
    }
}
