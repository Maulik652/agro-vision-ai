export const getApiErrorMessages = (error, fallback = "Something went wrong") => {
  const responseData = error?.response?.data;

  if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
    const messages = responseData.errors
      .map((item) => item?.message)
      .filter(Boolean);

    if (messages.length > 0) {
      return [...new Set(messages)];
    }
  }

  if (responseData?.message) {
    return [responseData.message];
  }

  if (error?.code === "ECONNABORTED") {
    return ["Request timed out. Please try again."];
  }

  if (error?.message === "Network Error") {
    return ["Unable to reach server. Please check your connection."];
  }

  return [fallback];
};

export const getApiFieldErrors = (error) => {
  const responseData = error?.response?.data;

  if (!Array.isArray(responseData?.errors)) {
    return {};
  }

  return responseData.errors.reduce((accumulator, item) => {
    const field = item?.field;
    const message = item?.message;

    if (!message) {
      return accumulator;
    }

    if (!field) {
      if (!accumulator._form) {
        accumulator._form = message;
      }

      return accumulator;
    }

    if (!accumulator[field]) {
      accumulator[field] = message;
    }

    return accumulator;
  }, {});
};
