const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

const errorHandler = (err, req, res, next) => {
  const statusCode =
    err.statusCode ||
    (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message || 'Server Error';

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    message = 'Malformed JSON body';
  } else if (err.name === 'ValidationError') {
    message = err.message;
  } else if (err.name === 'MulterError') {
    message = err.message || 'File upload error';
  } else if (err.name === 'CastError') {
    message = 'Invalid identifier provided';
  } else if (err.name === 'JsonWebTokenError') {
    message = 'Not authorized, token failed';
  } else if (err.name === 'TokenExpiredError') {
    message = 'Not authorized, token expired';
  } else if (err.message?.startsWith('Authentication error')) {
    message = err.message;
  } else if (err.name === 'MongoServerError' && err.code === 11000) {
    message = 'Duplicate value error';
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }
  res.status(statusCode).json({ message });
};

module.exports = {
  notFound,
  errorHandler,
};
