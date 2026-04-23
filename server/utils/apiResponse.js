/**
 * Standard API response helpers.
 *
 * Every response from the API must conform to:
 * {
 *   success: boolean,
 *   message: string,
 *   data: object | array | null,
 *   error: string | null
 * }
 */

/**
 * Send a successful response.
 * @param {import('express').Response} res
 * @param {object} options
 * @param {number}  [options.status=200]
 * @param {string}  [options.message='Success']
 * @param {any}     [options.data=null]
 */
export const sendSuccess = (res, { status = 200, message = 'Success', data = null } = {}) => {
  return res.status(status).json({
    success: true,
    message,
    data: data ?? null,
    error: null,
  });
};

/**
 * Send a failure response.
 * @param {import('express').Response} res
 * @param {object} options
 * @param {number}  [options.status=500]
 * @param {string}  [options.message='An error occurred']
 * @param {string}  [options.error=null]
 */
export const sendError = (res, { status = 500, message = 'An error occurred', error = null } = {}) => {
  return res.status(status).json({
    success: false,
    message,
    data: null,
    error: error ?? null,
  });
};

/**
 * Express error handler wrapper.
 * Use inside catch blocks instead of repeating the same pattern.
 *
 * @param {import('express').Response} res
 * @param {Error} err
 * @param {string} [fallbackMessage]
 */
export const sendCatchError = (res, err, fallbackMessage = 'Internal Server Error') => {
  const status = err.statusCode || 500;
  const message = status < 500 ? err.message : fallbackMessage;
  return sendError(res, { status, message, error: err.message });
};
