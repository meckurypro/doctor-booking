// ============================================================
// TEMPLATE REGISTRY
// Import every template file here.
// To add a new template: create a file in /src/templates/
// and add it to this registry. No other files need changing.
// ============================================================

import officeHandover from './office-handover'
import memoryLane     from './memory-lane'

// Registry: slug → template definition
const REGISTRY = {
  [officeHandover.slug]: officeHandover,
  [memoryLane.slug]:     memoryLane,
}

/**
 * getTemplate(slug)
 * Returns the template definition for a given slug, or null.
 */
export const getTemplate = (slug) => REGISTRY[slug] ?? null

/**
 * getAllTemplates()
 * Returns all registered templates as an array.
 */
export const getAllTemplates = () => Object.values(REGISTRY)

/**
 * getTemplatesByVisibility(visibility)
 * 'promptiq' | 'public'
 */
export const getTemplatesByVisibility = (visibility) =>
  Object.values(REGISTRY).filter((t) => t.visibility === visibility)

export default REGISTRY
