/**
 * Helper function to safely render templates with res.locals
 * This ensures all middleware-set variables (links, permissions, etc.) 
 * are always available to templates
 * 
 * @param {Object} res - Express response object
 * @param {string} template - Template name
 * @param {Object} data - Page-specific data
 */
const renderWithLocals = (res, template, data = {}) => {
    const context = Object.assign({}, res.locals, data);
    res.render(template, context);
};

export { renderWithLocals };
