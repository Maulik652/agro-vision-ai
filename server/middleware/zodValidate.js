export const validateQuery = (schema) => (req, res, next) => {
  const parsed = schema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(422).json({
      message: "Validation failed",
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  req.validatedQuery = parsed.data;
  return next();
};

export const validateBody = (schema) => (req, res, next) => {
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(422).json({
      message: "Validation failed",
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  req.validatedBody = parsed.data;
  return next();
};

export const validateParams = (schema) => (req, res, next) => {
  const parsed = schema.safeParse(req.params);

  if (!parsed.success) {
    return res.status(422).json({
      message: "Validation failed",
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  req.validatedParams = parsed.data;
  return next();
};
