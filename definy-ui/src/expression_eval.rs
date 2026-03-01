pub fn evaluate_expression(expression: &definy_event::event::Expression) -> Result<i64, &'static str> {
    match expression {
        definy_event::event::Expression::Add(add_expression) => add_expression
            .left
            .checked_add(add_expression.right)
            .ok_or("overflow while adding two numbers"),
    }
}

pub fn expression_to_source(expression: &definy_event::event::Expression) -> String {
    match expression {
        definy_event::event::Expression::Add(add_expression) => {
            format!("+ {} {}", add_expression.left, add_expression.right)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{evaluate_expression, expression_to_source};

    #[test]
    fn evaluate_expression_works() {
        let expression = definy_event::event::Expression::Add(definy_event::event::AddExpression {
            left: 1,
            right: 2,
        });
        assert_eq!(evaluate_expression(&expression), Ok(3));
        assert_eq!(expression_to_source(&expression), "+ 1 2");
    }
}
