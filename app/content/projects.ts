import { projectIndex } from '../../cms/derive'
import { publishedContent } from './site'
import { pageBlock, workshop } from './workshop'

/**
 * Autorskie projekty jako seria: 01, 02, 03… Kolejny projekt to kolejny wpis
 * na liście; blok „Teraz” na głównej pokazuje projekt oznaczony jako bieżący.
 */
export interface Project {
  number: string
  name: string
  path: string
  lead: string
}

const home = publishedContent.pages['']!

export const projects: readonly Project[] = [
  { number: workshop.number, name: workshop.name, path: workshop.path, lead: pageBlock(home, 'current-project').lead },
]

export const currentProject: Project = projects[0]!

export const projectLabel = (project: Project) => projectIndex(project)
