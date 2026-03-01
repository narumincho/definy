pub fn evaluate_add_expression(input: &str) -> Result<i64, &'static str> {
    let mut tokens = input.split_whitespace();
    let op = tokens.next().ok_or("empty expression")?;
    if op != "+" {
        return Err("only '+' is supported");
    }

    let left = tokens
        .next()
        .ok_or("left operand is missing")?
        .parse::<i64>()
        .map_err(|_| "left operand must be a number")?;
    let right = tokens
        .next()
        .ok_or("right operand is missing")?
        .parse::<i64>()
        .map_err(|_| "right operand must be a number")?;

    if tokens.next().is_some() {
        return Err("too many tokens; expected: + <number> <number>");
    }

    left.checked_add(right)
        .ok_or("overflow while adding two numbers")
}

#[cfg(test)]
mod tests {
    use super::evaluate_add_expression;

    #[test]
    fn evaluate_plus_expression() {
        assert_eq!(evaluate_add_expression("+ 1 2"), Ok(3));
        assert!(evaluate_add_expression("- 1 2").is_err());
        assert!(evaluate_add_expression("+ 1").is_err());
        assert!(evaluate_add_expression("+ 1 2 3").is_err());
    }
}
